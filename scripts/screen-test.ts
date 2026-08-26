import fs from "node:fs";
import { extractCvText } from "../src/lib/extract";
import { redact, aliasFor, nameFromFilename } from "../src/lib/redact";
import { screenCandidate, MODEL } from "../src/lib/screen";
import { TOTAL_WEIGHT } from "../src/lib/rubric";
import type { ScreenOutcome } from "../src/lib/screen";

type Row =
  | ({ name: string; arithmeticOk: boolean; error?: undefined } & ScreenOutcome)
  | { name: string; error: string };

const isFailure = (r: Row): r is { name: string; error: string } => "error" in r && !!r.error;

// The full batch, from the command line, so a regression shows up without a
// browser in the loop.

async function main() {
  const jd = fs.readFileSync("sample-data/job-description.txt", "utf8");
  const [title, ...rest] = jd.split("\n");
  const jobTitle = title.trim();
  const jobDescription = rest.join("\n").trim();

  const files = fs.readdirSync("public/samples").filter((f) => f.endsWith(".pdf")).sort();
  console.log(`Rubric weights total ${TOTAL_WEIGHT}. Screening ${files.length} CVs with ${MODEL}.\n`);

  const started = Date.now();
  const rows: Row[] = await Promise.all(
    files.map(async (f, i): Promise<Row> => {
      const buf = fs.readFileSync(`public/samples/${f}`);
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      const { text, error } = await extractCvText(ab, f);
      const name = nameFromFilename(f);
      if (error) return { name, error };
      const { text: red } = redact(text, name, aliasFor(i));
      try {
        const out = await screenCandidate(jobTitle, jobDescription, red, aliasFor(i));
        // The arithmetic must be reproducible from the ratings alone.
        const recomputed = Math.round(out.breakdown.reduce((s, b) => s + b.points, 0));
        return { name, ...out, arithmeticOk: recomputed === out.score };
      } catch (e) {
        return { name, error: e instanceof Error ? e.message : String(e) };
      }
    })
  );

  const ok = rows.filter((r): r is Extract<Row, { arithmeticOk: boolean }> => !isFailure(r));
  ok.sort((a, b) => b.score - a.score);

  console.log("RANK  SCORE  BAND             CANDIDATE          MATH  GAPS");
  ok.forEach((r, i) => {
    console.log(
      `${String(i + 1).padStart(4)}  ${String(r.score).padStart(5)}  ${r.band.padEnd(15)}  ${r.name.padEnd(17)}  ${r.arithmeticOk ? " ok " : "BAD "}  ${r.gaps.length}`
    );
  });

  const failed = rows.filter(isFailure);
  for (const f of failed) console.log(`FAIL  ${f.name}: ${f.error}`);

  const badMath = ok.filter((r) => !r.arithmeticOk);
  console.log(`\n${ok.length}/${files.length} screened in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(badMath.length === 0 ? "Every score recomputes from its ratings." : `${badMath.length} scores do not recompute.`);
  process.exit(failed.length > 0 || badMath.length > 0 ? 1 : 0);
}
main();
