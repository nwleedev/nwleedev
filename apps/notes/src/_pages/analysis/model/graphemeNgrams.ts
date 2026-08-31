const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
})

export function splitGraphemes(text: string) {
  return Array.from(
    graphemeSegmenter.segment(text),
    ({ segment }) => segment,
  )
}

export function createGraphemeNgrams(text: string, size = 3) {
  const graphemes = splitGraphemes(text)
  const ngrams = new Set<string>()

  for (let index = 0; index <= graphemes.length - size; index += 1) {
    ngrams.add(graphemes.slice(index, index + size).join(""))
  }

  return ngrams
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
