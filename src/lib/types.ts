import type { CriterionId } from "./rubric";
import type { Redaction } from "./redact";

/** What the model returns for one criterion. It rates; it does not total. */
export interface CriterionAssessment {
  id: CriterionId;
  rating: number;
  /** Quoted or closely paraphrased from the CV. The receipt for the rating. */
  evidence: string;
  /** One line on why that evidence earned that rating. */
  reasoning: string;
}

export interface Candidate {
  id: string;
  /** The real name, shown to the recruiter. Never sent to the model. */
  displayName: string;
  /** What the model called them. Kept so the audit trail lines up. */
  alias: string;
  filename: string;
  score: number;
  band: string;
  bandAction: string;
  breakdown: { id: CriterionId; rating: number; weight: number; points: number }[];
  assessments: CriterionAssessment[];
  strengths: string[];
  gaps: string[];
  /** The model's summary sentence. Advice to a recruiter, not a decision. */
  summary: string;
  redactions: Redaction[];
  /** Characters of CV text extracted. Surfaced so a failed PDF parse is visible. */
  extractedChars: number;
  /** Set when the CV could not be read or scored. The row still appears. */
  error?: string;
}

export interface ScreenResult {
  jobTitle: string;
  candidates: Candidate[];
  model: string;
  screenedAt: string;
  /** Wall-clock seconds for the whole batch, quoted in the demo. */
  durationSeconds: number;
}
