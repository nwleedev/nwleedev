import afterReport from "../content/report.after.md?raw";
import beforeReport from "../content/report.before.md?raw";
import { changeSections, type ChangeSection } from "./changes";

export type TextPart = {
  kind: "text";
  text: string;
};

export type ChangePart = {
  kind: "change";
  id: string;
  sectionId: string;
  before: string;
  after: string;
};

export type ArticlePart = TextPart | ChangePart;

export type ChangeExample = {
  section: ChangeSection;
  parts: readonly ArticlePart[];
};

type DraftChange = Omit<ChangePart, "id" | "sectionId">;
type DraftPart = TextPart | DraftChange;
type Word = { text: string; start: number; end: number };

function linesOf(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/gu) ?? [];
}

function wordsOf(text: string): Word[] {
  return Array.from(text.matchAll(/\S+/gu), (match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function wordAt(words: readonly Word[], index: number): Word {
  const word = words[index];

  if (!word) {
    throw new Error("Report word index is outside the document.");
  }

  return word;
}

function appendText(parts: DraftPart[], text: string): void {
  if (!text) return;

  const last = parts.at(-1);

  if (last?.kind === "text") {
    last.text += text;
  } else {
    parts.push({ kind: "text", text });
  }
}

function combineNearbyChanges(parts: DraftPart[]): void {
  for (let index = 1; index < parts.length - 1; index += 1) {
    const previous = parts[index - 1];
    const bridge = parts[index];
    const following = parts[index + 1];

    if (
      previous?.kind !== "change" ||
      bridge?.kind !== "text" ||
      following?.kind !== "change" ||
      bridge.text.includes("\n") ||
      bridge.text.trim().length > 0 ||
      bridge.text.length > 8
    ) {
      continue;
    }

    previous.before += bridge.text + following.before;
    previous.after += bridge.text + following.after;
    parts.splice(index, 2);
    index -= 1;
  }
}

function fillEmptySide(parts: DraftPart[]): void {
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];

    if (part?.kind !== "change" || (part.before.trim() && part.after.trim())) {
      continue;
    }

    const previous = parts[index - 1];
    const previousWord = previous?.kind === "text"
      ? previous.text.match(/\S+\s*$/u)?.[0]
      : undefined;

    if (previous?.kind === "text" && previousWord) {
      previous.text = previous.text.slice(0, -previousWord.length);
      part.before = previousWord + part.before;
      part.after = previousWord + part.after;
      continue;
    }

    const following = parts[index + 1];
    const followingWord = following?.kind === "text"
      ? following.text.match(/^\s*\S+/u)?.[0]
      : undefined;

    if (following?.kind === "text" && followingWord) {
      following.text = following.text.slice(followingWord.length);
      part.before += followingWord;
      part.after += followingWord;
      continue;
    }

    throw new Error("A report change has no visible text in one version.");
  }
}

function diffSection(before: string, after: string): DraftPart[] {
  const beforeWords = wordsOf(before);
  const afterWords = wordsOf(after);
  const scores = Array.from(
    { length: beforeWords.length + 1 },
    () => new Uint16Array(afterWords.length + 1),
  );

  function scoreAt(beforeIndex: number, afterIndex: number): number {
    return scores[beforeIndex]?.[afterIndex] ?? 0;
  }

  for (let beforeIndex = beforeWords.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
    const row = scores[beforeIndex];

    if (!row) {
      throw new Error("Report comparison row is missing.");
    }

    for (let afterIndex = afterWords.length - 1; afterIndex >= 0; afterIndex -= 1) {
      row[afterIndex] = beforeWords[beforeIndex]?.text === afterWords[afterIndex]?.text
        ? scoreAt(beforeIndex + 1, afterIndex + 1) + 1
        : Math.max(scoreAt(beforeIndex + 1, afterIndex), scoreAt(beforeIndex, afterIndex + 1));
    }
  }

  const matches: Array<readonly [number, number]> = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  while (beforeIndex < beforeWords.length && afterIndex < afterWords.length) {
    if (beforeWords[beforeIndex]?.text === afterWords[afterIndex]?.text) {
      matches.push([beforeIndex, afterIndex]);
      beforeIndex += 1;
      afterIndex += 1;
      continue;
    }

    if (scoreAt(beforeIndex + 1, afterIndex) >= scoreAt(beforeIndex, afterIndex + 1)) {
      beforeIndex += 1;
    } else {
      afterIndex += 1;
    }
  }

  const parts: DraftPart[] = [];
  let beforeOffset = 0;
  let afterOffset = 0;

  for (const [matchedBefore, matchedAfter] of matches) {
    const beforeWord = wordAt(beforeWords, matchedBefore);
    const afterWord = wordAt(afterWords, matchedAfter);
    const beforeGap = before.slice(beforeOffset, beforeWord.start);
    const afterGap = after.slice(afterOffset, afterWord.start);

    if (beforeGap === afterGap) {
      appendText(parts, beforeGap);
    } else {
      parts.push({ kind: "change", before: beforeGap, after: afterGap });
    }

    appendText(parts, beforeWord.text);
    beforeOffset = beforeWord.end;
    afterOffset = afterWord.end;
  }

  const beforeEnd = before.slice(beforeOffset);
  const afterEnd = after.slice(afterOffset);

  if (beforeEnd === afterEnd) {
    appendText(parts, beforeEnd);
  } else {
    parts.push({ kind: "change", before: beforeEnd, after: afterEnd });
  }

  combineNearbyChanges(parts);
  fillEmptySide(parts);

  return parts.filter((part) => part.kind === "change" || part.text.length > 0);
}

const beforeLines = linesOf(beforeReport);
const afterLines = linesOf(afterReport);
const articleParts: ArticlePart[] = [];
const examples: ChangeExample[] = [];
let beforeLine = 0;
let afterLine = 0;

for (const section of changeSections) {
  const commonBefore = beforeLines.slice(beforeLine, section.before[0] - 1).join("");
  const commonAfter = afterLines.slice(afterLine, section.after[0] - 1).join("");

  if (commonBefore !== commonAfter) {
    throw new Error(`Unmapped report text before ${section.id}.`);
  }

  if (commonBefore) {
    articleParts.push({ kind: "text", text: commonBefore });
  }

  const before = beforeLines.slice(section.before[0] - 1, section.before[1]).join("");
  const after = afterLines.slice(section.after[0] - 1, section.after[1]).join("");
  const parts = diffSection(before, after).map((part, index) => {
    if (part.kind === "text") {
      return part;
    }

    return {
      ...part,
      id: `${section.id}-${index}`,
      sectionId: section.id,
    };
  });

  articleParts.push(...parts);
  examples.push({ section, parts });
  beforeLine = section.before[1];
  afterLine = section.after[1];
}

const finalBefore = beforeLines.slice(beforeLine).join("");
const finalAfter = afterLines.slice(afterLine).join("");

if (finalBefore !== finalAfter) {
  throw new Error("Unmapped report text after the final change.");
}

if (finalBefore) {
  articleParts.push({ kind: "text", text: finalBefore });
}

const reconstructedBefore = articleParts.map((part) => part.kind === "text" ? part.text : part.before).join("");
const reconstructedAfter = articleParts.map((part) => part.kind === "text" ? part.text : part.after).join("");

if (reconstructedBefore !== beforeReport || reconstructedAfter !== afterReport) {
  throw new Error("Report changes do not reconstruct both source documents.");
}

export { articleParts, examples };
