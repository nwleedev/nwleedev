const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
})

export function splitGraphemes(text: string) {
  return Array.from(
    graphemeSegmenter.segment(text),
    ({ segment }) => segment,
  )
}
