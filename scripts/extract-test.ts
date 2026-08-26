import fs from "node:fs";
import { extractCvText } from "../src/lib/extract";
import { redact, aliasFor, nameFromFilename } from "../src/lib/redact";

async function main() {
  const files = fs.readdirSync("public/samples").filter((f) => f.endsWith(".pdf")).sort();
  let bad = 0;
  for (const [i, f] of files.entries()) {
    const buf = fs.readFileSync(`public/samples/${f}`);
    const { text, error } = await extractCvText(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, f);
    const name = nameFromFilename(f);
    const { text: red, redactions } = redact(text, name, aliasFor(i));
    const leaks = /@example\.com|linkedin\.com|github\.com/.test(red);
    const nameLeak = name.split(" ").some((p) => p.length > 2 && new RegExp(`\\b${p}\\b`, "i").test(red));
    const ok = !error && text.length > 400 && !leaks && !nameLeak;
    if (!ok) bad++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${f.padEnd(26)} name="${name}" chars=${String(text.length).padStart(5)} redacted=${redactions.length}${error ? ` ERR=${error}` : ""}${leaks ? " CONTACT-LEAK" : ""}${nameLeak ? " NAME-LEAK" : ""}`
    );
  }
  console.log(bad === 0 ? "\nAll PDFs extract and de-identify cleanly." : `\n${bad} failed`);
  process.exit(bad > 0 ? 1 : 0);
}
main();
