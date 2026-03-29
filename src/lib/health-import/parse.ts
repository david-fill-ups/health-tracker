import Anthropic from "@anthropic-ai/sdk";
import { EMPTY_ENTITIES } from "./types";
import type { FolderDocuments } from "./extract";
import type { ExtractedEntities } from "./types";

const SCHEMA_DESCRIPTION = `{
  "facilities": [
    {
      "name": "string (required) — clinic/hospital/lab/pharmacy name",
      "type": "optional: Clinic | Hospital | Lab | Pharmacy | Urgent Care | Dental | Imaging | Supplier | Other",
      "phone": "optional string",
      "address": "optional free-form address string",
      "notes": "optional string"
    }
  ],
  "doctors": [
    {
      "name": "string (required) — full name WITHOUT honorific or credential, e.g. 'Jane Smith' not 'Dr. Jane Smith, MD'",
      "specialty": "optional string e.g. Endocrinology, Urology, PCP",
      "credential": "optional: MD | DO | NP | PA | DDS | OD | DC | PT | ARNP | LCSW | Other — put the credential HERE not in the name",
      "facilityName": "optional — name of the facility this doctor works at",
      "phone": "optional string",
      "notes": "optional string"
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
      "prescriberName": "optional — doctor name who prescribed it",
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
      "metricType": "string (required) — MUST be one of the following exact values: weight | blood_pressure_systolic | blood_pressure_diastolic | blood_sugar_fasting | blood_sugar_postmeal | heart_rate | blood_oxygen | tsh | free_t4 | free_t3 | total_t4 | total_t3 | ldl_cholesterol | hdl_cholesterol | total_cholesterol | triglycerides | hemoglobin_a1c | creatinine | egfr | bun | uric_acid | alt | ast | alp | bilirubin_total | albumin | ferritin | iron | tibc | transferrin_saturation | vitamin_d | vitamin_b12 | folate | testosterone_total | testosterone_free | psa | sodium | potassium | calcium | magnesium | phosphorus | bicarbonate | chloride | wbc | rbc | hemoglobin | hematocrit | platelets | neutrophils | lymphocytes | eosinophils | inr | c_reactive_protein | esr | dhea_s | cortisol | insulin_fasting | homocysteine",
      "value": "number (required)",
      "unit": "string (required) e.g. lbs, kg, mmHg, mg/dL, bpm, %",
      "measuredAt": "string (required) YYYY-MM-DDTHH:mm:ss — use noon (T12:00:00) if time unknown",
      "notes": "optional string"
    }
  ]
}`;

const METRICS_ONLY_SCHEMA = `{
  "healthMetrics": [
    {
      "metricType": "string (required) — MUST be one of the following exact values: weight | blood_pressure_systolic | blood_pressure_diastolic | blood_sugar_fasting | blood_sugar_postmeal | heart_rate | blood_oxygen | tsh | free_t4 | free_t3 | total_t4 | total_t3 | ldl_cholesterol | hdl_cholesterol | total_cholesterol | triglycerides | hemoglobin_a1c | creatinine | egfr | bun | uric_acid | alt | ast | alp | bilirubin_total | albumin | ferritin | iron | tibc | transferrin_saturation | vitamin_d | vitamin_b12 | folate | testosterone_total | testosterone_free | psa | sodium | potassium | calcium | magnesium | phosphorus | bicarbonate | chloride | wbc | rbc | hemoglobin | hematocrit | platelets | neutrophils | lymphocytes | eosinophils | inr | c_reactive_protein | esr | dhea_s | cortisol | insulin_fasting | homocysteine",
      "value": "number (required)",
      "unit": "string (required) e.g. lbs, kg, mmHg, mg/dL, bpm, %, mIU/L, ng/dL, IU/L",
      "measuredAt": "string (required) YYYY-MM-DDTHH:mm:ss — use noon (T12:00:00) if time unknown",
      "notes": "optional string"
    }
  ]
}`;

/**
 * Use Claude to extract structured medical entities from visit documents.
 *
 * PDFs are sent as base64 document blocks (Claude handles both text-based
 * and scanned/image-based PDFs via its vision capabilities). DOCX content
 * is included as text blocks.
 *
 * @param client - Anthropic SDK client instance
 * @param documents - PDFs (as base64) and DOCX texts from extractDocumentsFromFolder()
 * @param visitLabel - Visit folder name (used as date/context hint)
 * @param model - Claude model to use (defaults to claude-sonnet-4-6)
 * @param metricsOnly - If true, only extract health metrics (faster/cheaper for re-extraction)
 */
export async function parseVisitDocuments(
  client: Anthropic,
  documents: FolderDocuments,
  visitLabel: string,
  model = "claude-sonnet-4-6",
  metricsOnly = false
): Promise<ExtractedEntities> {
  if (documents.pdfs.length === 0 && documents.docxTexts.length === 0) {
    return EMPTY_ENTITIES;
  }

  // Extract date from folder label (e.g. "2019.10.03 - Thyroid Surgery" → "2019-10-03")
  const dateMatch = visitLabel.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  const visitDateHint = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
    : null;

  const contextLine = visitDateHint
    ? `Visit date: ${visitDateHint}. Visit label: "${visitLabel}".`
    : `Visit label: "${visitLabel}".`;

  const schema = metricsOnly ? METRICS_ONLY_SCHEMA : SCHEMA_DESCRIPTION;
  const extractionScope = metricsOnly
    ? "Extract ALL quantitative health measurements from the attached documents — vitals (weight, BP, heart rate, O2 sat), lab results (cholesterol panel, thyroid panel, CBC, metabolic panel, HbA1c, PSA, vitamin levels, hormones, inflammatory markers), and any other numeric health measurements with explicit values and units."
    : "Extract all medical entities from the attached health visit documents.";

  const instructionText = `${contextLine}

${extractionScope} Return ONLY a JSON object matching the schema below — no markdown fences, no explanation.

If a date is not explicitly stated in a document but the visit date is known, use the visit date as the default.
Only include entities you are confident about. Omit optional fields when uncertain.
For healthMetrics, extract ALL clearly numeric measurements with explicit values — including vitals (weight, BP, heart rate), lab results (cholesterol, thyroid, blood glucose, CBC, metabolic panel), and any other quantitative health measurements. Use the visit date as measuredAt if no time is given.
Ignore billing/financial information, insurance details, and appointment scheduling forms.

SCHEMA:
${schema}`;

  // Build content blocks: PDFs first, then DOCX text, then instruction
  type ContentBlock =
    | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
    | { type: "text"; text: string };

  const contentBlocks: ContentBlock[] = [
    ...documents.pdfs.map((pdf) => ({
      type: "document" as const,
      source: {
        type: "base64" as const,
        media_type: "application/pdf" as const,
        data: pdf.base64,
      },
    })),
    ...documents.docxTexts.map((d) => ({
      type: "text" as const,
      text: `--- ${d.name} ---\n${d.text.slice(0, 20000)}`,
    })),
    { type: "text" as const, text: instructionText },
  ];

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system:
        "You are a medical document parser. Extract structured health data and return ONLY valid JSON with no markdown code blocks or explanation.",
      messages: [{ role: "user", content: contentBlocks }],
    });

    const content = response.content[0];
    if (content.type !== "text") return EMPTY_ENTITIES;

    // Strip any accidental markdown fences
    const jsonText = content.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    const parsed = JSON.parse(jsonText);

    return {
      facilities: metricsOnly ? [] : (Array.isArray(parsed.facilities) ? parsed.facilities : []),
      doctors: metricsOnly ? [] : (Array.isArray(parsed.doctors) ? parsed.doctors : []),
      medications: metricsOnly ? [] : (Array.isArray(parsed.medications) ? parsed.medications : []),
      conditions: metricsOnly ? [] : (Array.isArray(parsed.conditions) ? parsed.conditions : []),
      allergies: metricsOnly ? [] : (Array.isArray(parsed.allergies) ? parsed.allergies : []),
      vaccinations: metricsOnly ? [] : (Array.isArray(parsed.vaccinations) ? parsed.vaccinations : []),
      healthMetrics: Array.isArray(parsed.healthMetrics) ? parsed.healthMetrics : [],
    };
  } catch (e) {
    console.error(
      `  [parse error] ${visitLabel}:`,
      e instanceof Error ? e.message : e
    );
    return EMPTY_ENTITIES;
  }
}
