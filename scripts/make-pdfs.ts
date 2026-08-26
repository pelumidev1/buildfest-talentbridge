import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Turn the plain-text sample CVs into real PDFs, so the demo exercises the
// same extraction path a recruiter's actual upload would.

const SRC = "sample-data/cvs";
const OUT = "public/samples";

const PAGE = { w: 595.28, h: 841.89 };
const MARGIN = 56;
const SIZE = 10.5;
const LEADING = 14.5;

function wrap(line: string, font: import("pdf-lib").PDFFont, max: number): string[] {
  if (line.trim() === "") return [""];
  const words = line.split(" ");
  const out: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, SIZE) > max && current) {
      out.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) out.push(current);
  return out;
}

async function build(file: string) {
  const text = fs.readFileSync(path.join(SRC, file), "utf8");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - MARGIN;
  const maxWidth = PAGE.w - MARGIN * 2;

  for (const raw of text.split("\n")) {
    // Section headers and the name line are the all-caps / first lines.
    const isHeader = /^[A-Z][A-Z\s&]+$/.test(raw.trim()) && raw.trim().length > 2;
    const f = isHeader ? bold : font;

    for (const line of wrap(raw, f, maxWidth)) {
      if (y < MARGIN) {
        page = doc.addPage([PAGE.w, PAGE.h]);
        y = PAGE.h - MARGIN;
      }
      page.drawText(line, { x: MARGIN, y, size: SIZE, font: f, color: rgb(0.1, 0.1, 0.12) });
      y -= LEADING;
    }
  }

  const bytes = await doc.save();
  const name = file.replace(/\.txt$/, "-CV.pdf");
  fs.writeFileSync(path.join(OUT, name), bytes);
  return name;
}

async function main() {
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".txt")).sort();
  const made = await Promise.all(files.map(build));
  console.log(`built ${made.length} PDFs:`);
  for (const m of made) console.log("  " + m);
}

main();
