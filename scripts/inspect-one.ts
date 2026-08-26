import fs from "node:fs";
import { extractCvText } from "../src/lib/extract";
import { redact, aliasFor, nameFromFilename } from "../src/lib/redact";
import { screenCandidate } from "../src/lib/screen";

async function main() {
  const target = process.argv[2] ?? "kelechi-eze-CV.pdf";
  const jd = fs.readFileSync("sample-data/job-description.txt", "utf8");
  const [title, ...rest] = jd.split("\n");
  const buf = fs.readFileSync(`public/samples/${target}`);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const { text } = await extractCvText(ab, target);
  const { text: red } = redact(text, nameFromFilename(target), aliasFor(2));
  const out = await screenCandidate(title.trim(), rest.join("\n").trim(), red, aliasFor(2));
  console.log(`${target}  ->  ${out.score} (${out.band})\n`);
  for (const a of out.assessments) {
    console.log(`[${a.rating}/5] ${a.id}`);
    console.log(`  evidence:  ${a.evidence}`);
    console.log(`  reasoning: ${a.reasoning}\n`);
  }
  console.log("GAPS:", out.gaps);
}
main();
