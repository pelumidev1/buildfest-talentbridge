import { extractText, getDocumentProxy } from "unpdf";

/**
 * Pull plain text out of a CV.
 *
 * Handles PDF, and falls back to treating anything else as UTF-8 text so a
 * .txt or .md CV still screens. A scanned, image-only PDF yields almost
 * nothing; we surface that as an error rather than scoring an empty string,
 * because a blank CV would otherwise rank last and look like a judgement.
 */
export async function extractCvText(
  buffer: ArrayBuffer,
  filename: string
): Promise<{ text: string; error?: string }> {
  const isPdf = filename.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    const text = new TextDecoder().decode(buffer).trim();
    return text.length > 0
      ? { text }
      : { text: "", error: "File is empty." };
  }

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    const clean = (Array.isArray(text) ? text.join("\n") : text).trim();

    if (clean.length < 120) {
      return {
        text: clean,
        error:
          "Almost no text found. This is likely a scanned or image-only PDF, which needs OCR before it can be screened.",
      };
    }
    return { text: clean };
  } catch {
    return { text: "", error: "Could not read this PDF." };
  }
}
