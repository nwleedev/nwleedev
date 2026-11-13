import assert from "node:assert/strict"
import { test } from "node:test"

import { exportBounds, fitsOutput, overlapsOutput } from "../src/shared/export/index.ts"

test("export bounds encloses every rectangle at integer pixel edges", () => {
  const rectangles = [
    { x: 10, y: 20, width: 100, height: 50 },
    { x: 80, y: 5, width: 40, height: 90 },
  ]

  assert.deepEqual(exportBounds(rectangles, 0), {
    x: 10,
    y: 5,
    width: 110,
    height: 90,
  })
})

test("export bounds adds the same margin on all four sides", () => {
  const rectangles = [
    { x: 10, y: 20, width: 100, height: 50 },
    { x: 80, y: 5, width: 40, height: 90 },
  ]

  assert.deepEqual(exportBounds(rectangles, 24), {
    x: -14,
    y: -19,
    width: 158,
    height: 138,
  })
})

test("export bounds includes negative and fractional rectangle edges", () => {
  const rectangles = [
    { x: -10.25, y: 3.5, width: 5.5, height: 6.25 },
    { x: 8.2, y: -7.8, width: 10.1, height: 3.1 },
  ]

  assert.deepEqual(exportBounds(rectangles, 0), {
    x: -11,
    y: -8,
    width: 30,
    height: 18,
  })
})

test("export bounds is undefined when there is nothing to export", () => {
  assert.equal(exportBounds([], 0), undefined)
  assert.equal(exportBounds([], 24), undefined)
})

test("output fits when each side is at its limit and the area is below its limit", () => {
  assert.equal(fitsOutput({ x: 0, y: 0, width: 12_288, height: 1 }), true)
  assert.equal(fitsOutput({ x: 0, y: 0, width: 1, height: 12_288 }), true)
})

test("output exceeds the limit when either side is one pixel too long", () => {
  assert.equal(fitsOutput({ x: 0, y: 0, width: 12_289, height: 1 }), false)
  assert.equal(fitsOutput({ x: 0, y: 0, width: 1, height: 12_289 }), false)
})

test("output accepts exactly 28 million pixels and rejects one pixel more", () => {
  assert.equal(fitsOutput({ x: -24, y: -24, width: 5_000, height: 5_600 }), true)
  assert.equal(fitsOutput({ x: -24, y: -24, width: 5_000, height: 5_601 }), false)
})

test("only rectangles with visible area inside the output overlap it", () => {
  const output = { x: -20, y: 30, width: 100, height: 80 }
  assert.equal(overlapsOutput(output, { x: 75, y: 90, width: 20, height: 30 }), true)
  assert.equal(overlapsOutput(output, { x: 80, y: 90, width: 20, height: 30 }), false)
  assert.equal(overlapsOutput(output, { x: -40, y: -20, width: 60, height: 50 }), false)
})
