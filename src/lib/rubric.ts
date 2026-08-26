// The scoring rubric. This file is the answer to "why did this candidate get 78?"
//
// Two rules govern everything here:
//
//   1. The model rates each criterion 0-5 against evidence it must quote.
//      It never returns a total. The arithmetic happens in code, below,
//      so the same ratings always produce the same score and a recruiter
//      can recompute any number by hand.
//
//   2. The weights are fixed before any CV is seen. They do not change
//      per candidate. A rubric that moves is not a rubric.

export interface Criterion {
  id: CriterionId;
  label: string;
  /** Points this criterion contributes at a perfect 5/5. Weights sum to 100. */
  weight: number;
  /** Shown to the recruiter in the UI, and sent to the model as its brief. */
  definition: string;
}

export const CRITERION_IDS = [
  "core_skills",
  "relevant_experience",
  "tools",
  "credentials",
  "evidence_of_impact",
] as const;

export type CriterionId = (typeof CRITERION_IDS)[number];

export const RUBRIC: Criterion[] = [
  {
    id: "core_skills",
    label: "Core skills match",
    weight: 30,
    definition:
      "Does the candidate demonstrably hold the must-have skills named in the job description? Rate on coverage of the required skills, not on how many skills the CV lists in total.",
  },
  {
    id: "relevant_experience",
    label: "Relevant experience",
    weight: 25,
    definition:
      "How closely does the candidate's actual work history match the seniority, scope and domain the role asks for? Years alone are not the measure; five years in an unrelated domain rates lower than two years doing this exact job.",
  },
  {
    id: "tools",
    label: "Tools and technologies",
    weight: 15,
    definition:
      "Has the candidate used the specific tools, platforms and technologies the job description names? Credit hands-on use, not passing familiarity or a keyword in a skills list with no supporting experience.",
  },
  {
    id: "credentials",
    label: "Education and certifications",
    weight: 10,
    definition:
      "Does the candidate meet the education or certification requirements the job description actually states? If the job description states no requirement, rate 3 and say so; do not invent a standard the employer did not ask for.",
  },
  {
    id: "evidence_of_impact",
    label: "Evidence of impact",
    weight: 20,
    definition:
      "Does the CV show measurable outcomes the candidate produced, or only a list of duties they were assigned? Numbers, scale, delivered results and named consequences rate high. 'Responsible for' with no outcome rates low.",
  },
];

export const RUBRIC_BY_ID: Record<CriterionId, Criterion> = Object.fromEntries(
  RUBRIC.map((c) => [c.id, c])
) as Record<CriterionId, Criterion>;

/** The 0-5 scale, spelled out so the model and the recruiter read it the same way. */
export const RATING_SCALE: Record<number, string> = {
  0: "No evidence in the CV at all",
  1: "Barely touches the requirement",
  2: "Partial, with clear gaps",
  3: "Meets the requirement",
  4: "Exceeds the requirement",
  5: "Exceptional, well beyond what was asked",
};

export const MAX_RATING = 5;

export interface Band {
  id: BandId;
  label: string;
  min: number;
  /** What the recruiter is being advised to do. Advice, not a decision. */
  action: string;
}

export type BandId = "strong" | "possible" | "weak" | "not_a_match";

// Bands are ranges, not verdicts. The recruiter still ticks the box.
export const BANDS: Band[] = [
  { id: "strong", label: "Strong match", min: 80, action: "Recommend for interview" },
  { id: "possible", label: "Possible match", min: 60, action: "Worth a recruiter read" },
  { id: "weak", label: "Weak match", min: 40, action: "Hold unless the pool is thin" },
  { id: "not_a_match", label: "Not a match", min: 0, action: "No further review" },
];

export function bandFor(score: number): Band {
  return BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];
}

/**
 * Turn 0-5 ratings into a 0-100 score. Deterministic and reversible:
 * points for a criterion = rating / 5 * weight.
 */
export function computeScore(ratings: Record<CriterionId, number>): {
  total: number;
  breakdown: { id: CriterionId; rating: number; weight: number; points: number }[];
} {
  const breakdown = RUBRIC.map((c) => {
    const raw = ratings[c.id];
    // A missing or malformed rating is treated as no evidence, never skipped.
    // Skipping would quietly shrink the denominator and inflate the score.
    const rating = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), MAX_RATING) : 0;
    return {
      id: c.id,
      rating,
      weight: c.weight,
      points: Math.round((rating / MAX_RATING) * c.weight * 10) / 10,
    };
  });

  const total = Math.round(breakdown.reduce((sum, b) => sum + b.points, 0));
  return { total, breakdown };
}

/** Sanity check used by the tests: the rubric must always add up to 100. */
export const TOTAL_WEIGHT = RUBRIC.reduce((sum, c) => sum + c.weight, 0);
