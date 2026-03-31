import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import type { WebExtractedEntities, WebUploadedFile } from "./types";
import { EMPTY_WEB_ENTITIES } from "./types";

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

function isSupportedImage(mimeType: string): mimeType is SupportedImageType {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

const SCHEMA_DESCRIPTION = `{
  "facilities": [
    {
      "name": "string (required) — clinic/hospital/lab/pharmacy name",
      "type": "optional: Clinic | Hospital | Lab | Pharmacy | Urgent Care | Dental | Imaging | Therapy | Supplier | Virtual | Other",
      "phone": "optional string",
      "address": "optional free-form address string",
      "websiteUrl": "optional string",
      "notes": "optional string"
    }
  ],
  "doctors": [
    {
      "name": "string (required) — full name WITHOUT honorific or credential, e.g. 'Jane Smith' not 'Dr. Jane Smith, MD'",
      "specialty": "optional string e.g. Endocrinology, Urology, PCP",
      "credential": "optional: MD | DO | NP | PA | DDS | OD | DC | PT | ARNP | LCSW | Other",
      "facilityName": "optional — name of the facility this doctor works at",
      "phone": "optional string",
      "notes": "optional string"
    }
  ],
  "visits": [
    {
      "date": "optional YYYY-MM-DD — date of the visit",
      "type": "optional: ROUTINE | LAB | SPECIALIST | URGENT | TELEHEALTH | PROCEDURE | OTHER",
      "reason": "optional — reason for the visit",
      "specialty": "optional — office or specialty",
      "facilityName": "optional — where the visit occurred",
      "doctorName": "optional — treating provider (no honorific or credential)",
      "notes": "optional — summary of visit notes, diagnoses discussed, or follow-up instructions"
    }
  ],
  "medications": [
    {
      "name": "string (required) — medication name",
      "type": "optional: ORAL | INJECTABLE | TOPICAL | INHALER | SUPPLEMENT | DEVICE | OTHER",
      "dosage": "optional string e.g. 100mg, 0.5mL",
      "frequency": "optional string e.g. once daily, twice weekly",
      "startDate": "optional YYYY-MM-DD — date first prescribed or administered",
      "endDate": "optional YYYY-MM-DD — date stopped if discontinued",
      "prescriberName": "optional — doctor name who prescribed it (no honorific or credential)",
      "active": "optional boolean — true if currently active, false if discontinued",
      "instructions": "optional string",
      "notes": "optional string"
    }
  ],
  "conditions": [
    {
      "name": "string (required) — diagnosis or condition name",
      "diagnosisDate": "optional YYYY-MM-DD",
      "status": "optional: ACTIVE | RESOLVED | MONITORING | BENIGN",
      "notes": "optional string"
    }
  ],
  "allergies": [
    {
      "allergen": "string (required) — substance name",
      "category": "optional: Environmental | Food | Drug | Insect | Other",
      "diagnosisDate": "optional YYYY-MM-DD",
      "notes": "optional string — reaction description"
    }
  ],
  "vaccinations": [
    {
      "name": "string (required) — vaccine name",
      "date": "string (required) YYYY-MM-DD — date administered",
      "facilityName": "optional — where it was given",
      "lotNumber": "optional string",
      "notes": "optional string"
    }
  ],
  "healthMetrics": [
    {
      "metricType": "string (required) — MUST be one of: weight | blood_pressure_systolic | blood_pressure_diastolic | blood_sugar_fasting | blood_sugar_postmeal | heart_rate | blood_oxygen | tsh | free_t4 | free_t3 | total_t4 | total_t3 | ldl_cholesterol | hdl_cholesterol | total_cholesterol | triglycerides | hemoglobin_a1c | creatinine | egfr | bun | uric_acid | alt | ast | alp | bilirubin_total | albumin | ferritin | iron | tibc | transferrin_saturation | vitamin_d | vitamin_b12 | folate | testosterone_total | testosterone_free | psa | sodium | potassium | calcium | magnesium | phosphorus | bicarbonate | chloride | wbc | rbc | hemoglobin | hematocrit | platelets | neutrophils | lymphocytes | eosinophils | inr | c_reactive_protein | esr | dhea_s | cortisol | insulin_fasting | homocysteine",
      "value": "number (required)",
      "unit": "string (required) e.g. lbs, kg, mmHg, mg/dL, bpm, %",
      "measuredAt": "string (required) YYYY-MM-DDTHH:mm:ss — use noon (T12:00:00) if time unknown",
      "notes": "optional string"
    }
  ]
}`;

type ContentBlock =
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: SupportedImageType; data: string } }
  | { type: "text"; text: string };

/**
 * Extract medical entities from uploaded files using Claude.
 *
 * Supports:
 * - PDFs (sent as base64 document blocks — handles both text-based and scanned/image PDFs)
 * - Images (JPEG, PNG, GIF, WebP — sent as base64 image blocks for vision)
 * - DOCX (text extracted via mammoth, sent as text blocks)
 *
 * @param client - Anthropic SDK client
 * @param files - Uploaded file buffers with MIME types
 * @param context - Optional context hint (e.g. "Visit on 2024-03-15 at Johns Hopkins")
 * @param revisionFeedback - User's revision request from a previous extraction
 * @param previousExtraction - Previous extraction JSON for revision context
 */
export async function parseWebDocuments(
  client: Anthropic,
  files: WebUploadedFile[],
  context?: string,
  revisionFeedback?: string,
  previousExtraction?: WebExtractedEntities
): Promise<WebExtractedEntities> {
  if (files.length === 0) return EMPTY_WEB_ENTITIES;

  const contentBlocks: ContentBlock[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    if (file.mimeType === "application/pdf") {
      const base64 = file.buffer.toString("base64");
      contentBlocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      });
    } else if (isSupportedImage(file.mimeType)) {
      const base64 = file.buffer.toString("base64");
      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: file.mimeType, data: base64 },
      });
    } else if (
      file.mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        const text = result.value.slice(0, 20000);
        if (text.trim()) {
          contentBlocks.push({ type: "text", text: `--- ${file.name} ---\n${text}` });
        }
      } catch {
        warnings.push(`Could not read ${file.name}`);
      }
    }
    // Other MIME types silently skipped
  }

  if (contentBlocks.length === 0) return EMPTY_WEB_ENTITIES;

  const contextLine = context ? `Context: ${context}.` : "";

  let instructionText: string;
  if (revisionFeedback && previousExtraction) {
    instructionText = `${contextLine}

Previous extraction result:
${JSON.stringify(previousExtraction, null, 2)}

User feedback / revision request: "${revisionFeedback}"

Please re-extract medical entities from the attached documents incorporating the user's feedback. Return ONLY a JSON object matching the schema below — no markdown fences, no explanation.

${warnings.length > 0 ? `Note: ${warnings.join("; ")}` : ""}

SCHEMA:
${SCHEMA_DESCRIPTION}`;
  } else {
    instructionText = `${contextLine}

Extract all medical entities from the attached health documents. Return ONLY a JSON object matching the schema below — no markdown fences, no explanation.

Rules:
- Only include entities you are confident about. Omit optional fields when uncertain.
- For healthMetrics, extract ALL clearly numeric measurements with explicit values — vitals, lab results, and any quantitative health measurements.
- Use the visit date as measuredAt for health metrics if no specific time is given.
- Ignore billing/financial information, insurance details, and appointment scheduling forms.
- For visits: extract visit-level information (date, provider, facility, reason, summary notes).
- For doctors: omit honorifics and credentials from the name field — put credentials in the credential field.

${warnings.length > 0 ? `Note: ${warnings.join("; ")}` : ""}

SCHEMA:
${SCHEMA_DESCRIPTION}`;
  }

  contentBlocks.push({ type: "text", text: instructionText });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8096,
      system:
        "You are a medical document parser. Extract structured health data and return ONLY valid JSON with no markdown code blocks or explanation.",
      messages: [{ role: "user", content: contentBlocks }],
    });

    const content = response.content[0];
    if (content.type !== "text") return EMPTY_WEB_ENTITIES;

    const jsonText = content.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    const parsed = JSON.parse(jsonText);

    return {
      facilities: Array.isArray(parsed.facilities) ? parsed.facilities : [],
      doctors: Array.isArray(parsed.doctors) ? parsed.doctors : [],
      visits: Array.isArray(parsed.visits) ? parsed.visits : [],
      medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
      allergies: Array.isArray(parsed.allergies) ? parsed.allergies : [],
      vaccinations: Array.isArray(parsed.vaccinations) ? parsed.vaccinations : [],
      healthMetrics: Array.isArray(parsed.healthMetrics) ? parsed.healthMetrics : [],
    };
  } catch (e) {
    console.error("[ai-import/parse-web] extraction error:", e instanceof Error ? e.message : e);
    return EMPTY_WEB_ENTITIES;
  }
}
