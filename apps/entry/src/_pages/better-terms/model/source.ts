import afterReport from "../content/report.after.md?raw";
import beforeReport from "../content/report.before.md?raw";
import { articleParts, type ArticlePart } from "./article";

type SourceToken = {
  text: string;
  kind: "plain" | "heading" | "marker";
};

type SourceText = {
  kind: "text";
  tokens: readonly SourceToken[];
};

type SourceChange = Extract<ArticlePart, { kind: "change" }> & {
  beforeTokens: readonly SourceToken[];
  afterTokens: readonly SourceToken[];
};

export type SourcePart = SourceText | SourceChange;

function addToken(tokens: SourceToken[], text: string, kind: SourceToken["kind"]): void {
  if (!text) return;

  const previous = tokens.at(-1);

  if (previous?.kind === kind) {
    previous.text += text;
  } else {
    tokens.push({ text, kind });
  }
}

function tokensOf(text: string, source: string, offset: number): SourceToken[] {
  const tokens: SourceToken[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const absolute = offset + cursor;
    const lineStart = source.lastIndexOf("\n", absolute - 1) + 1;
    const lineEndIndex = source.indexOf("\n", absolute);
    const lineEnd = lineEndIndex < 0 ? source.length : lineEndIndex;
    const line = source.slice(lineStart, lineEnd);
    const fragmentEnd = Math.min(text.length, lineEnd - offset);
    const fragment = text.slice(cursor, fragmentEnd);
    const heading = /^#{1,6}\s/u.test(line);
    const tableDivider = /^\s*\|?\s*:?-{3,}/u.test(line);
    const listPrefix = /^(\s*)(?:[-+*]|\d+\.)\s/u.exec(line);
    const listStart = listPrefix ? lineStart + (listPrefix[1]?.length ?? 0) : -1;
    const marker = /`+|\*+|\[|\]\(|\)|\||#{1,6}|-+|\+|\d+\./gu;
    let local = 0;

    for (const match of fragment.matchAll(marker)) {
      const matchStart = match.index;
      addToken(tokens, fragment.slice(local, matchStart), heading ? "heading" : "plain");

      const markdownMarker = match[0];
      const atHeadingStart = heading && absolute + matchStart === lineStart;
      const isHeadingMarker = markdownMarker.startsWith("#") && atHeadingStart;
      const isTableDivider = markdownMarker.startsWith("-") && tableDivider;
      const isListMarker = absolute + matchStart === listStart;
      const isPunctuationMarker = !/^(?:#|-|\+|\d)/u.test(markdownMarker);
      const isSyntaxMarker = (isHeadingMarker || isTableDivider) || (isListMarker || isPunctuationMarker);
      let kind: SourceToken["kind"] = heading ? "heading" : "plain";

      if (isSyntaxMarker) kind = "marker";

      addToken(tokens, markdownMarker, kind);
      local = matchStart + markdownMarker.length;
    }

    addToken(tokens, fragment.slice(local), heading ? "heading" : "plain");
    cursor = fragmentEnd;

    if (text[cursor] === "\n") {
      addToken(tokens, "\n", "plain");
      cursor += 1;
    }
  }

  return tokens;
}

const sourceParts: SourcePart[] = [];
let beforeOffset = 0;
let afterOffset = 0;

for (const part of articleParts) {
  if (part.kind === "text") {
    sourceParts.push({ kind: "text", tokens: tokensOf(part.text, beforeReport, beforeOffset) });
    beforeOffset += part.text.length;
    afterOffset += part.text.length;
    continue;
  }

  sourceParts.push({
    ...part,
    beforeTokens: tokensOf(part.before, beforeReport, beforeOffset),
    afterTokens: tokensOf(part.after, afterReport, afterOffset),
  });
  beforeOffset += part.before.length;
  afterOffset += part.after.length;
}

export { sourceParts };
