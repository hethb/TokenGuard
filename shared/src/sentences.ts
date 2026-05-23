export interface SentenceSpan {
  text: string;
  start: number;
  end: number;
}

const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "sr",
  "jr",
  "st",
  "vs",
  "etc",
  "e.g",
  "i.e",
  "fig",
  "no",
  "vol",
  "inc",
  "ltd"
]);

/**
 * Lightweight sentence splitter. Avoids language-specific dependencies so it
 * runs identically in browser content scripts and in Node. Returns spans so
 * downstream tooling can rebuild text with offsets intact.
 */
export function splitSentences(text: string): SentenceSpan[] {
  if (!text) return [];
  const spans: SentenceSpan[] = [];
  let cursor = 0;
  const len = text.length;

  while (cursor < len) {
    // Skip leading whitespace.
    while (cursor < len && /\s/.test(text[cursor]!)) cursor++;
    if (cursor >= len) break;

    const start = cursor;
    let pushed = false;
    while (cursor < len) {
      const ch = text[cursor]!;
      if (ch === "." || ch === "!" || ch === "?") {
        // Look at what comes before the dot to avoid breaking on
        // common abbreviations like "e.g." or "Dr.".
        const slice = text.slice(start, cursor).toLowerCase();
        const lastSpace = slice.lastIndexOf(" ");
        const lastWord = slice.slice(lastSpace + 1).replace(/[^a-z.]/g, "");
        const isAbbrev = ABBREVIATIONS.has(lastWord);

        // Consume any clustered terminators ("?!", "...").
        let end = cursor + 1;
        while (end < len && /[.!?]/.test(text[end]!)) end++;

        if (!isAbbrev) {
          const sentenceText = text.slice(start, end).trim();
          if (sentenceText.length > 0) {
            spans.push({ text: sentenceText, start, end });
            pushed = true;
          }
          cursor = end;
          break;
        } else {
          cursor = end;
        }
      } else if (ch === "\n") {
        // Treat blank lines as a sentence boundary too.
        if (cursor + 1 < len && text[cursor + 1] === "\n") {
          const sentenceText = text.slice(start, cursor).trim();
          if (sentenceText.length > 0) {
            spans.push({ text: sentenceText, start, end: cursor });
            pushed = true;
          }
          cursor += 2;
          break;
        }
        cursor++;
      } else {
        cursor++;
      }
    }

    // Hit end-of-string without finding a terminator → flush remainder.
    if (!pushed && cursor >= len) {
      const tail = text.slice(start, len).trim();
      if (tail.length > 0) {
        spans.push({ text: tail, start, end: len });
      }
    }
  }

  return spans;
}
