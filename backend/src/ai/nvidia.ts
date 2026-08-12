import { config } from "../config.js";
import type { AIVerificationResult, AiVerdict } from "@shared/types.js";

export interface AnalyzeInput {
  /** Base64 image (no data: prefix) */
  imageBase64: string;
  mimeType: string;
  expectedAmount: number;
  currency: string;
  orderNumber: string;
  productName: string;
}

interface NvidiaChatCompletion {
  choices?: {
    message?: { content?: string };
  }[];
}

/**
 * Build the analysis prompt. The AI is an assistant for the admin — it never
 * makes the final decision, so the prompt asks for evidence and structured
 * output, and reserves suspicion explicitly.
 */
function buildPrompt(input: AnalyzeInput): string {
  return `You are a financial document verification assistant for a subscription marketplace called SubMate operating in Pakistan.

A customer submitted a payment screenshot for order ${input.orderNumber}.
Expected payment details:
- Expected amount: ${input.currency} ${input.expectedAmount}
- Product: ${input.productName}

Look at the payment confirmation screenshot provided, then analyse it carefully.

Report the following fields:
- amountDetected: the payment amount visible in the screenshot (number, null if absent)
- currencyDetected: the currency symbol/ISO visible (e.g. PKR, Rs, Rs.)
- transactionId: any transaction / reference / TID visible (string, null if absent)
- paymentDate: date/time the payment was made (ISO string if visible, else null)
- receiver: the receiving wallet/bank/account shown (string, null if absent)
- sender: the sending wallet/bank/account shown (string, null if absent)
- paymentStatusMessage: the status text shown (e.g. "Successful", "Failed", null)
- issuesDetected: list of visible inconsistencies, modifications, mismatches, overlays, or suspicious edits (array of strings, empty if none)
- missingInformation: which critical fields are missing from the screenshot (array of strings, empty if none)
- readability: one of "CLEAR", "PARTIAL", "POOR" describing how readable the screenshot is
- confidence: a number 0-1 representing how confident you are in this analysis
- assessment: one of "LIKELY_VALID", "LIKELY_INVALID", "NEEDS_REVIEW", "UNREADABLE"
- summary: one short sentence summarising your finding

Rules:
- Extract EXACT figure from the OCR of the screenshot.
- Flag if the amount differs from the expected amount.
- Flag if no transaction/reference ID is visible.
- Flag anything that suggests image manipulation (cloned text, inconsistent fonts, unusual cropping, artifacts).
- Do NOT guess missing values. If a field is not visible, report null / empty.
- If the screenshot is blurry, cut off, unreadable, or clearly not a payment confirmation, report UNREADABLE.
- You are assisting a human reviewer; the final decision belongs to the administrator. Never state you have approved the payment.

Respond with ONLY valid JSON matching this schema (no markdown fences, no commentary):
{"amountDetected":number|null,"currencyDetected":string|null,"transactionId":string|null,"paymentDate":string|null,"receiver":string|null,"sender":string|null,"paymentStatusMessage":string|null,"issuesDetected":string[],"missingInformation":string[],"readability":"CLEAR"|"PARTIAL"|"POOR","confidence":number,"assessment":"LIKELY_VALID"|"LIKELY_INVALID"|"NEEDS_REVIEW"|"UNREADABLE","summary":string}`;
}

function extractJson(raw: string): Record<string, unknown> {
  const cleaned = raw.trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1]! : cleaned;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("AI response did not contain a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown as Record<string, unknown>;
}

/** Map model assessment + missing fields onto our normalized verdict. */
interface RawVerdictInputs {
  assessment?: string;
  readability?: string | null;
  confidence?: number | null;
  amountDetected?: number | null;
  transactionId?: string | null;
}

export function normalizeVerdict(raw: RawVerdictInputs): AiVerdict {
  const assessment = (raw.assessment ?? "").toUpperCase();
  const known: AiVerdict[] = ["LIKELY_VALID", "LIKELY_INVALID", "NEEDS_REVIEW", "UNREADABLE"];
  if (known.includes(assessment as AiVerdict)) return assessment as AiVerdict;

  const readability = (raw.readability ?? "").toUpperCase();
  const confidence = raw.confidence ?? null;
  if (readability === "POOR" || (!raw.amountDetected && !raw.transactionId)) return "UNREADABLE";
  if (confidence === null && !raw.amountDetected) return "UNREADABLE";
  if (confidence !== null && confidence >= 0.75 && raw.amountDetected !== null) return "LIKELY_VALID";
  if (confidence !== null && confidence <= 0.4) return "LIKELY_INVALID";
  return "NEEDS_REVIEW";
}

/**
 * Send the screenshot to an NVIDIA vision model and return a structured
 * verification result. Throws on transport/parse failure so callers can
 * record aiError and route the payment to admin review.
 */
export async function analyzePaymentScreenshot(input: AnalyzeInput): Promise<AIVerificationResult> {
  if (!config.nvidiaApiKey) {
    throw new Error("NVIDIA_API_KEY is not configured. AI analysis skipped.");
  }

  const dataUrl = `data:${input.mimeType};base64,${input.imageBase64}`;

  const res = await fetch(`${config.nvidiaBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.nvidiaApiKey}`,
    },
    body: JSON.stringify({
      model: config.nvidiaVisionModel,
      max_tokens: 1600,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(input) },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`NVIDIA API responded ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as NvidiaChatCompletion;
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("NVIDIA API returned an empty response.");

  const parsed = extractJson(content) as unknown as {
    amountDetected?: number | string | null;
    currencyDetected?: string | null;
    transactionId?: string | null;
    paymentDate?: string | null;
    receiver?: string | null;
    sender?: string | null;
    paymentStatusMessage?: string | null;
    issuesDetected?: string[];
    missingInformation?: string[];
    readability?: string | null;
    confidence?: number | null;
    assessment?: string;
    summary?: string;
  };

  const issues = parsed.issuesDetected ?? [];
  const missing = parsed.missingInformation ?? [];
  if (parsed.amountDetected != null && Number(parsed.amountDetected) !== input.expectedAmount) {
    issues.push(
      `Amount mismatch: expected ${input.currency} ${input.expectedAmount}, detected ${parsed.amountDetected}.`,
    );
  }
  if (!parsed.transactionId) {
    missing.push("transactionId");
  }
  if (!parsed.amountDetected) {
    missing.push("amountDetected");
  }

  const verdict = normalizeVerdict({
    assessment: parsed.assessment,
    readability: parsed.readability ?? null,
    confidence: parsed.confidence != null ? Number(parsed.confidence) : null,
    amountDetected: parsed.amountDetected != null ? Number(parsed.amountDetected) : null,
    transactionId: parsed.transactionId ?? null,
  });

  return {
    status: verdict,
    amount: parsed.amountDetected != null && !Number.isNaN(Number(parsed.amountDetected))
      ? Number(parsed.amountDetected)
      : null,
    currency: parsed.currencyDetected ?? null,
    transactionId: parsed.transactionId ?? null,
    paymentDate: parsed.paymentDate ?? null,
    receiver: parsed.receiver ?? null,
    sender: parsed.sender ?? null,
    paymentStatus: parsed.paymentStatusMessage ?? null,
    confidence: parsed.confidence != null ? Number(parsed.confidence) : null,
    issues,
    missing,
    readability: parsed.readability ?? null,
    summary: parsed.summary ?? "",
  };
}