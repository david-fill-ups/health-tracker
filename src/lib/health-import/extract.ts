import fs from "fs/promises";
import path from "path";
// mammoth for DOCX text extraction (PDFs go directly to Claude as base64 documents)
import mammoth from "mammoth";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".tiff", ".bmp"]);

export interface FolderDocuments {
  /** Raw PDF files encoded as base64, for sending to Claude as document blocks */
  pdfs: Array<{ name: string; base64: string; sizeBytes: number }>;
  /** Text extracted from DOCX files */
  docxTexts: Array<{ name: string; text: string }>;
  fileCount: number;
  processedFiles: string[];
  skippedFiles: string[];
}

/**
 * Extract all processable content from a visit folder:
 * - PDFs are read as base64 (Claude handles both text-based and scanned/image PDFs)
 * - DOCX files are converted to plain text via mammoth
 * - Images, DICOM, and other files are skipped
 *
 * PDF size is capped at MAX_PDF_BYTES per file and MAX_TOTAL_PDF_BYTES total
 * to stay within Claude's request size limits.
 */
const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4MB per PDF
const MAX_TOTAL_PDF_BYTES = 20 * 1024 * 1024; // 20MB total across all PDFs in a folder

export async function extractDocumentsFromFolder(
  folderPath: string
): Promise<FolderDocuments> {
  let fileNames: string[];
  try {
    fileNames = await fs.readdir(folderPath);
  } catch {
    return {
      pdfs: [],
      docxTexts: [],
      fileCount: 0,
      processedFiles: [],
      skippedFiles: [],
    };
  }

  const pdfs: FolderDocuments["pdfs"] = [];
  const docxTexts: FolderDocuments["docxTexts"] = [];
  const processedFiles: string[] = [];
  const skippedFiles: string[] = [];
  let totalPdfBytes = 0;

  for (const fileName of fileNames) {
    const filePath = path.join(folderPath, fileName);

    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) continue;

    const ext = path.extname(fileName).toLowerCase();

    if (ext === ".pdf") {
      const sizeBytes = stat.size;
      if (sizeBytes > MAX_PDF_BYTES) {
        skippedFiles.push(`${fileName} (too large: ${Math.round(sizeBytes / 1024)}KB)`);
        continue;
      }
      if (totalPdfBytes + sizeBytes > MAX_TOTAL_PDF_BYTES) {
        skippedFiles.push(`${fileName} (total PDF limit reached)`);
        continue;
      }
      try {
        const buffer = await fs.readFile(filePath);
        pdfs.push({ name: fileName, base64: buffer.toString("base64"), sizeBytes });
        totalPdfBytes += sizeBytes;
        processedFiles.push(fileName);
      } catch {
        skippedFiles.push(`${fileName} (read error)`);
      }
    } else if (ext === ".docx") {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value.trim();
        if (text) {
          docxTexts.push({ name: fileName, text });
          processedFiles.push(fileName);
        } else {
          skippedFiles.push(`${fileName} (empty)`);
        }
      } catch {
        skippedFiles.push(`${fileName} (read error)`);
      }
    } else {
      skippedFiles.push(fileName);
    }
  }

  return {
    pdfs,
    docxTexts,
    fileCount: processedFiles.length,
    processedFiles,
    skippedFiles,
  };
}

export interface DirectoryScan {
  folders: string[];
  totalPdfs: number;
  totalDocx: number;
  totalImages: number;
  totalOther: number;
}

/**
 * Scan the top-level documents directory to count processable files.
 * Used by --scan-only mode.
 */
export async function scanDocsDirectory(
  docsDir: string
): Promise<DirectoryScan> {
  let folderNames: string[];
  try {
    folderNames = await fs.readdir(docsDir);
  } catch (e) {
    throw new Error(
      `Cannot read documents directory: ${docsDir}\n${e instanceof Error ? e.message : e}`
    );
  }

  const folders: string[] = [];
  for (const name of folderNames.sort()) {
    const stat = await fs.stat(path.join(docsDir, name)).catch(() => null);
    if (stat?.isDirectory()) folders.push(name);
  }

  let totalPdfs = 0,
    totalDocx = 0,
    totalImages = 0,
    totalOther = 0;

  for (const folder of folders) {
    const folderPath = path.join(docsDir, folder);
    let files: string[];
    try {
      files = await fs.readdir(folderPath);
    } catch {
      continue;
    }
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".pdf") totalPdfs++;
      else if (ext === ".docx") totalDocx++;
      else if (IMAGE_EXTS.has(ext)) totalImages++;
      else totalOther++;
    }
  }

  return { folders, totalPdfs, totalDocx, totalImages, totalOther };
}
