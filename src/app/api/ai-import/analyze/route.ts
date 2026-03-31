import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertProfileAccess, PermissionError } from "@/lib/permissions";
import { parseWebDocuments } from "@/lib/ai-import/parse-web";
import { enrichWithNpi } from "@/lib/ai-import/npi-enrich";
import { generateImportProposal } from "@/lib/ai-import/proposal";
import type { WebUploadedFile } from "@/lib/ai-import/types";

const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_FILES = 20;

const SUPPORTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const profileId = formData.get("profileId");
  if (!profileId || typeof profileId !== "string") {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const visitId = formData.get("visitId");
  const revisionFeedback = formData.get("revisionFeedback");
  const context = formData.get("context");

  try {
    await assertProfileAccess(session.user.id, profileId, "WRITE");
  } catch (e) {
    if (e instanceof PermissionError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }

  // Collect uploaded files
  const rawFiles = formData.getAll("files");
  const webFiles: WebUploadedFile[] = [];
  let totalBytes = 0;
  const warnings: string[] = [];

  for (const raw of rawFiles.slice(0, MAX_FILES)) {
    if (!(raw instanceof File)) continue;
    if (!SUPPORTED_TYPES.has(raw.type)) {
      warnings.push(`Skipped unsupported file type: ${raw.name}`);
      continue;
    }
    const bytes = await raw.arrayBuffer();
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_TOTAL_BYTES) {
      warnings.push(`Skipped ${raw.name}: total upload exceeds 20 MB limit`);
      break;
    }
    webFiles.push({ name: raw.name, mimeType: raw.type, buffer: Buffer.from(bytes) });
  }

  if (webFiles.length === 0) {
    return NextResponse.json({ error: "No supported files provided" }, { status: 400 });
  }

  // Build context hint from visitId
  let contextHint = typeof context === "string" ? context : undefined;
  if (visitId && typeof visitId === "string" && !contextHint) {
    try {
      const visit = await prisma.visit.findUnique({
        where: { id: visitId },
        select: {
          date: true,
          reason: true,
          doctor: { select: { name: true } },
          facility: { select: { name: true } },
        },
      });
      if (visit) {
        const parts: string[] = [];
        if (visit.date) parts.push(`Visit date: ${new Date(visit.date).toISOString().slice(0, 10)}`);
        if (visit.doctor) parts.push(`Doctor: ${visit.doctor.name}`);
        if (visit.facility) parts.push(`Facility: ${visit.facility.name}`);
        if (visit.reason) parts.push(`Reason: ${visit.reason}`);
        if (parts.length > 0) contextHint = parts.join(". ");
      }
    } catch {
      // Non-fatal
    }
  }

  const client = new Anthropic();

  try {
    // Step 1: Extract entities with Claude
    const extracted = await parseWebDocuments(
      client,
      webFiles,
      contextHint,
      typeof revisionFeedback === "string" ? revisionFeedback : undefined
    );

    // Step 2: Enrich new facilities/doctors with NPI data
    await enrichWithNpi(extracted);

    // Step 3: Compare against existing DB data → produce proposal
    const proposal = await generateImportProposal(
      extracted,
      profileId,
      prisma,
      typeof visitId === "string" ? visitId : undefined
    );

    // Attach any file warnings to the proposal
    if (warnings.length > 0) {
      proposal.warnings = [...(proposal.warnings ?? []), ...warnings];
    }

    return NextResponse.json(proposal);
  } catch (e) {
    console.error("[ai-import/analyze] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Failed to analyze documents" }, { status: 500 });
  }
}
