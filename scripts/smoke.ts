import { screenCandidate, MODEL } from "../src/lib/screen";
import { redact, aliasFor } from "../src/lib/redact";

const JD = `Data Analyst. Requirements: SQL, Python (pandas), Power BI or Tableau,
3+ years in analytics, experience building dashboards for commercial teams,
a degree in a numerate subject.`;

const CV = `Ada Obieze
ada.obieze@example.com | +234 803 555 0142 | Lagos, Nigeria
Date of Birth: 12 March 1996
Gender: Female

SUMMARY
Data analyst with 4 years building reporting for retail and fintech teams.

EXPERIENCE
Senior Data Analyst, PayGrid (2023-2026)
- Rebuilt the merchant reporting suite in Power BI, cutting month-end close from 9 days to 2.
- Wrote the SQL models behind the churn dashboard used weekly by the commercial team.
Data Analyst, Kobo Retail (2022-2023)
- Daily sales reporting in Python (pandas) across 40 stores.

EDUCATION
BSc Statistics, University of Lagos, 2021`;

async function main() {
  const alias = aliasFor(0);
  const { text, redactions } = redact(CV, "Ada Obieze", alias);
  console.log("--- REDACTIONS ---");
  console.log(redactions.map((r) => `${r.kind} x${r.count}`).join(", "));
  console.log("--- TEXT SENT TO MODEL (first 400) ---");
  console.log(text.slice(0, 400));
  console.log(`--- CALLING ${MODEL} ---`);
  const t = Date.now();
  const out = await screenCandidate("Data Analyst", JD, text, alias);
  console.log(`took ${((Date.now() - t) / 1000).toFixed(1)}s`);
  console.log("SCORE:", out.score, "|", out.band, "|", out.bandAction);
  console.log("BREAKDOWN:", out.breakdown.map((b) => `${b.id} ${b.rating}/5 = ${b.points}`).join("\n  "));
  console.log("STRENGTHS:", out.strengths);
  console.log("GAPS:", out.gaps);
  console.log("SUMMARY:", out.summary);
  console.log("EVIDENCE SAMPLE:", JSON.stringify(out.assessments[0], null, 2));
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
