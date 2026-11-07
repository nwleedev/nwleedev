import * as fc from "fast-check"

export const noteContent = fc.string({
  maxLength: 32,
  minLength: 1,
  unit: "grapheme-ascii",
})
