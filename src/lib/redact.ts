// Blind screening. The model that scores a CV never sees who the candidate is.
//
// The case study asks the solution to "focus only on job-related information
// and avoid using irrelevant personal details". Instructing a model to ignore
// a name is not the same as it not having one: the name is still in the
// context window, and names carry gender, ethnicity and nationality signals
// that have no business touching a score.
//
// So we remove them before the call rather than asking nicely afterwards.
// The recruiter still sees every real name in the UI. The scorer sees
// "Candidate A".

export interface Redaction {
  /** Which class of personal detail was removed. */
  kind: string;
  /** How many times it was removed. Never the value itself. */
  count: number;
}

export interface RedactionResult {
  text: string;
  redactions: Redaction[];
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

// Broad shape, then a digit-count gate. The naive "long run of digits and
// separators" pattern also swallows employment date ranges like "(2023-2026)",
// which quietly deletes the work history the experience rating depends on.
// Real numbers carry at least 9 digits; a year range carries 8.
const PHONE_SHAPE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const MIN_PHONE_DIGITS = 9;

function isPhone(match: string): boolean {
  return (match.match(/\d/g) || []).length >= MIN_PHONE_DIGITS;
}

const URL = /\b(?:https?:\/\/|www\.)\S+/gi;
const LINKEDIN = /\blinkedin\.com\/[\w\/-]+/gi;
const GITHUB = /\bgithub\.com\/[\w\/-]+/gi;

// Labelled lines. These are the fields that show up on CVs in this region and
// are exactly the ones a screen must not weigh.
const LABELLED = new Map<string, RegExp>([
  ["date of birth", /^[ \t]*(?:date of birth|d\.?o\.?b\.?|birth date)[ \t]*[:\-].*$/gim],
  ["age", /^[ \t]*age[ \t]*[:\-].*$/gim],
  ["gender", /^[ \t]*(?:gender|sex)[ \t]*[:\-].*$/gim],
  ["marital status", /^[ \t]*marital status[ \t]*[:\-].*$/gim],
  ["nationality", /^[ \t]*(?:nationality|citizenship)[ \t]*[:\-].*$/gim],
  ["state of origin", /^[ \t]*(?:state of origin|lga|local government)[ \t]*[:\-].*$/gim],
  ["religion", /^[ \t]*religion[ \t]*[:\-].*$/gim],
  ["address", /^[ \t]*(?:address|home address|residential address)[ \t]*[:\-].*$/gim],
  ["photograph", /^[ \t]*(?:photo|photograph|passport photograph)[ \t]*[:\-]?.*$/gim],
  ["name", /^[ \t]*(?:name|full name|surname|first name|last name)[ \t]*[:\-].*$/gim],
]);

/** Escape a string so it can be dropped into a RegExp as a literal. */
function literal(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Strip identity from CV text.
 *
 * `displayName` is what the recruiter sees in the table. We pass it in so we
 * can remove every occurrence of it (and each of its parts) from the text the
 * model reads, including the header line, the footer, and any "References:
 * available on request, contact Ada Obi" tail.
 */
export function redact(raw: string, displayName: string, alias: string): RedactionResult {
  let text = raw;
  const redactions: Redaction[] = [];

  const record = (kind: string, before: string, after: string, pattern: RegExp) => {
    const count = (before.match(pattern) || []).length;
    if (count > 0) redactions.push({ kind, count });
    return after;
  };

  for (const [kind, pattern] of LABELLED) {
    const before = text;
    text = text.replace(pattern, `[${kind} removed]`);
    record(kind, before, text, pattern);
  }

  let before = text;
  text = text.replace(EMAIL, "[email removed]");
  record("email", before, text, EMAIL);

  before = text;
  text = text.replace(LINKEDIN, "[profile removed]");
  record("linkedin", before, text, LINKEDIN);

  before = text;
  text = text.replace(GITHUB, "[profile removed]");
  record("github", before, text, GITHUB);

  before = text;
  text = text.replace(URL, "[link removed]");
  record("url", before, text, URL);

  let phoneHits = 0;
  text = text.replace(PHONE_SHAPE, (match) => {
    if (!isPhone(match)) return match;
    phoneHits += 1;
    return "[phone removed]";
  });
  if (phoneHits > 0) redactions.push({ kind: "phone", count: phoneHits });

  // The name itself, last, so the earlier passes have already taken the
  // header line it usually sits on. Longest parts first: replacing "Ada"
  // before "Ada Obi" would leave a stray "Obi" behind.
  const parts = displayName
    .split(/[\s,]+/)
    .map((p) => p.replace(/[^\p{L}\p{N}'-]/gu, ""))
    .filter((p) => p.length > 2)
    .sort((a, b) => b.length - a.length);

  let nameHits = 0;
  for (const part of [displayName, ...parts]) {
    if (!part || part.length < 3) continue;
    const pattern = new RegExp(`\\b${literal(part)}\\b`, "gi");
    nameHits += (text.match(pattern) || []).length;
    text = text.replace(pattern, alias);
  }
  if (nameHits > 0) redactions.push({ kind: "candidate name", count: nameHits });

  return { text, redactions };
}

/** "Candidate A", "Candidate B", ... "Candidate Z", "Candidate AA". */
export function aliasFor(index: number): string {
  let n = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Candidate ${label}`;
}

/** Turn "ada-obi-cv.pdf" into "Ada Obi" when the CV text gives us nothing better. */
export function nameFromFilename(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, "");
  return (
    stem
      .replace(/[_-]+/g, " ")
      .replace(/\b(cv|resume|curriculum vitae|final|updated|copy|v\d+)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\p{Ll}/gu, (c) => c.toUpperCase()) || stem
  );
}
