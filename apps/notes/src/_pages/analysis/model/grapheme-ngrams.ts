import { splitGraphemes } from "@/shared/lib/grapheme"

export { splitGraphemes }

export function createGraphemeNgramsFromSegments(
  graphemes: readonly string[],
  size = 3,
) {
  const ngrams = new Set<string>()

  for (let index = 0; index <= graphemes.length - size; index += 1) {
    ngrams.add(graphemes.slice(index, index + size).join(""))
  }

  return ngrams
}

export function createGraphemeNgrams(text: string, size = 3) {
  return createGraphemeNgramsFromSegments(splitGraphemes(text), size)
}

export function calculateJaccard(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
) {
  let intersectionSize = 0

  for (const value of left) {
    if (right.has(value)) {
      intersectionSize += 1
    }
  }

  const unionSize = left.size + right.size - intersectionSize
  return unionSize === 0 ? 0 : intersectionSize / unionSize
}
