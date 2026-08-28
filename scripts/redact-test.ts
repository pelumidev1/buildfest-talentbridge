import { redact, aliasFor, nameFromFilename } from "../src/lib/redact";

const CV = `Ada Obieze
ada.obieze@example.com | +234 803 555 0142 | Lagos, Nigeria
Date of Birth: 12 March 1996
Gender: Female
Marital Status: Single
https://www.linkedin.com/in/adaobieze
https://github.com/adaobieze
Portfolio: https://ada.example.com/work

EXPERIENCE
Senior Data Analyst, PayGrid (2023-2026)
Data Analyst, Kobo Retail (2022-2023)
Cut close from 9 days to 2. Managed 40 stores. Budget of 1,200,000 naira.
Contact Ada for references. Reach Obieze on 08035550142.`;

const { text, redactions } = redact(CV, "Ada Obieze", aliasFor(0));
console.log(text);
console.log("\n--- REDACTIONS ---");
console.log(redactions.map((r) => `${r.kind} x${r.count}`).join(", "));

const checks: [string, boolean][] = [
  ["date range 2023-2026 survives", text.includes("(2023-2026)")],
  ["date range 2022-2023 survives", text.includes("(2022-2023)")],
  ["real phone redacted", !text.includes("08035550142")],
  ["intl phone redacted", !text.includes("803 555 0142")],
  ["email redacted", !text.includes("ada.obieze@example.com")],
  ["name gone everywhere", !/Ada|Obieze/.test(text)],
  ["dob line gone", !text.includes("12 March 1996")],
  ["gender line gone", !text.includes("Female")],
  ["linkedin gone", !text.includes("adaobieze")],
  // A CV writes its profile as a full URL. The profile pass has to consume the
  // scheme too, or the URL pass that follows chews the leftover stub and the
  // model reads "[link removed] removed]".
  ["no double-replaced link markers", !text.includes("removed] removed]")],
  ["profile links marked as profiles", (text.match(/\[profile removed\]/g) || []).length === 2],
  ["plain portfolio link still marked as a link", text.includes("[link removed]")],
  ["impact numbers survive", text.includes("9 days to 2") && text.includes("40 stores")],
  ["filename parsing", nameFromFilename("ada-obieze-CV-final.pdf") === "Ada Obieze"],
  ["alias sequence", aliasFor(0) === "Candidate A" && aliasFor(25) === "Candidate Z" && aliasFor(26) === "Candidate AA"],
];
console.log("\n--- CHECKS ---");
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}
process.exit(failed > 0 ? 1 : 0);
