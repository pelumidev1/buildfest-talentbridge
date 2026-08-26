import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { CRITERION_IDS, RUBRIC, RATING_SCALE, MAX_RATING, computeScore, bandFor } from "./rubric";
import type { CriterionId } from "./rubric";
import type { CriterionAssessment } from "./types";

// Sonnet 5 by default: this prompt runs once per CV and gets run dozens of
// times during testing, so the cheaper model is the sane default. Set
// SCREENER_MODEL=claude-opus-5 for the sharper read on a real shortlist.
export const MODEL = process.env.SCREENER_MODEL ?? "claude-sonnet-5";

const client = new Anthropic();

// The model rates and cites. It never returns a total, and it never sees a
// name. Both of those are enforced outside this schema (computeScore does the
// arithmetic; redact() strips the identity) but the schema is what stops the
// model from volunteering a total we would then have to ignore.
const AssessmentSchema = z.object({
  criterion: z.enum(CRITERION_IDS),
  rating: z
    .number()
    .int()
    .min(0)
    .max(MAX_RATING)
    .describe("0-5 against the scale you were given."),
  evidence: z
    .string()
    .describe(
      "The exact words from the CV that justify this rating, quoted. If the CV says nothing relevant, write: No evidence in CV."
    ),
  reasoning: z.string().describe("One sentence: why that evidence earns that rating."),
});

const ScreenSchema = z.object({
  assessments: z.array(AssessmentSchema).length(CRITERION_IDS.length),
  // No .min()/.max() here on purpose. A schema cap does not make the model
  // concise, it makes the whole candidate fail validation when the model
  // finds a fifth gap. We ask for brevity in the prompt and trim in code.
  strengths: z.array(z.string()).describe("Up to 4. What this candidate brings to THIS role."),
  gaps: z
    .array(z.string())
    .describe("Up to 4. Requirements from the job description this CV does not evidence. Empty if none."),
  summary: z
    .string()
    .describe("Two sentences to a recruiter deciding whether to spend 30 minutes interviewing."),
});

function buildSystemPrompt(): string {
  const scale = Object.entries(RATING_SCALE)
    .map(([n, meaning]) => `${n} = ${meaning}`)
    .join("\n");

  const criteria = RUBRIC.map(
    (c) => `- ${c.id} (${c.label}, worth ${c.weight} of 100)\n  ${c.definition}`
  ).join("\n");

  return `You screen CVs against a job description for a recruitment team. You produce a first-pass assessment that a human recruiter then reviews. You are not making a hiring decision and you must not write as though you are.

Rate the candidate on each of these five criteria:

${criteria}

Use this scale for every rating:

${scale}

Rules you must follow:

1. Rate only against the job description you are given. If the job description does not ask for something, it cannot be a gap.
2. Every rating needs evidence quoted from the CV. If there is no evidence, rate 0 and write "No evidence in CV" as the evidence. Never infer a skill the CV does not state.
3. Do not compute or mention a total score, a percentage, or a rank. You rate the five criteria and nothing else. The total is calculated elsewhere.
4. The CV has been de-identified before it reached you. Names, contact details, addresses, ages, gender, nationality and photographs have been removed and replaced with placeholders like "Candidate C" or "[email removed]". This is deliberate. Do not speculate about who the candidate is, and never treat a redaction as a gap in their application.
5. Judge the work, not the writing. A plainly formatted CV describing strong delivery outranks a polished one describing duties.
6. Write plainly. No marketing language, no em dashes, no hedging phrases like "appears to potentially".`;
}

function buildUserPrompt(jobTitle: string, jobDescription: string, cvText: string, alias: string) {
  return `JOB TITLE
${jobTitle}

JOB DESCRIPTION
${jobDescription}

DE-IDENTIFIED CV (${alias})
${cvText}`;
}

export interface ScreenOutcome {
  assessments: CriterionAssessment[];
  strengths: string[];
  gaps: string[];
  summary: string;
  score: number;
  band: string;
  bandAction: string;
  breakdown: ReturnType<typeof computeScore>["breakdown"];
}

/** Screen one de-identified CV. Throws on API failure; the caller decides what a failed row looks like. */
export async function screenCandidate(
  jobTitle: string,
  jobDescription: string,
  cvText: string,
  alias: string
): Promise<ScreenOutcome> {
  // One retry. Structured-output failures are usually a truncated or slightly
  // malformed generation rather than a bad CV, and a second pass almost always
  // lands. Retrying more than once turns a systematic failure into a bill.
  try {
    return await attempt(jobTitle, jobDescription, cvText, alias);
  } catch {
    return await attempt(jobTitle, jobDescription, cvText, alias);
  }
}

async function attempt(
  jobTitle: string,
  jobDescription: string,
  cvText: string,
  alias: string
): Promise<ScreenOutcome> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low",
      format: zodOutputFormat(ScreenSchema),
    },
    system: [
      {
        type: "text",
        text: buildSystemPrompt(),
        // The system prompt and rubric are byte-identical across every CV in
        // a batch, so the second candidate onward reads them from cache.
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      { role: "user", content: buildUserPrompt(jobTitle, jobDescription, cvText, alias) },
    ],
  });

  const parsed = response.parsed_output;
  if (!parsed) throw new Error("The model returned a response that did not match the schema.");

  // Re-key by criterion id rather than trusting array order, then hand the
  // ratings to computeScore. The model's array could arrive in any order and
  // a positional read would silently score the wrong criterion.
  const ratings = {} as Record<CriterionId, number>;
  const assessments: CriterionAssessment[] = [];

  for (const id of CRITERION_IDS) {
    const found = parsed.assessments.find((a) => a.criterion === id);
    ratings[id] = found?.rating ?? 0;
    assessments.push({
      id,
      rating: ratings[id],
      evidence: found?.evidence ?? "No evidence in CV",
      reasoning: found?.reasoning ?? "The model did not return this criterion; scored as no evidence.",
    });
  }

  const { total, breakdown } = computeScore(ratings);
  const band = bandFor(total);

  return {
    assessments,
    strengths: parsed.strengths.slice(0, 4),
    gaps: parsed.gaps.slice(0, 4),
    summary: parsed.summary,
    score: total,
    band: band.label,
    bandAction: band.action,
    breakdown,
  };
}
