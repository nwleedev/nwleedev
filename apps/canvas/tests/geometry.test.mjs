import assert from "node:assert/strict"
import { test } from "node:test"

import { attachedMemoRect, imageSizeAtWidth } from "../src/entities/project/model/geometry.ts"
import { memoCorner, memoSizeAtCorner } from "../src/pages/editor/model/memo-resize.ts"

test("resizing preserves the original ratio and caps enlargement at the original size", () => {
  for (const [originalWidth, originalHeight] of [[640, 480], [300, 600]]) {
    const original = { originalWidth, originalHeight }
    assert.deepEqual(imageSizeAtWidth(original, originalWidth / 2), {
      width: originalWidth / 2,
      height: originalHeight / 2,
    })
    assert.deepEqual(imageSizeAtWidth(original, originalWidth * 2), {
      width: originalWidth,
      height: originalHeight,
    })
    assert.throws(() => imageSizeAtWidth(original, Infinity))
    assert.throws(() => imageSizeAtWidth(original, 0))
  }
})

test("dragging the outer memo corner changes both dimensions on every attached edge", () => {
  const image = { x: -20, y: 10, width: 120, height: 100 }
  const cases = [
    ["top", { x: 90, y: -50 }],
    ["right", { x: 200, y: 90 }],
    ["bottom", { x: 90, y: 170 }],
    ["left", { x: -120, y: 90 }],
  ]

  for (const [side, point] of cases) {
    const size = memoSizeAtCorner(image, side, point)
    assert.deepEqual(size, { width: 100, height: 60 })
    assert.deepEqual(memoCorner(attachedMemoRect(image, { side, ...size }), side), point)
  }
})

test("a memo stays centered against its edge after moving and resizing either rectangle", () => {
  const image = { x: -90, y: 12, width: 320, height: 240 }
  const moved = { x: 82, y: -63, width: 640, height: 480 }
  const sizes = [{ width: 42, height: 71 }, { width: 740, height: 820 }]

  for (const { x, y, width, height } of [image, moved]) {
    for (const size of sizes) {
      const centerX = x + width / 2
      const centerY = y + height / 2
      const top = attachedMemoRect({ x, y, width, height }, { ...size, side: "top" })
      const bottom = attachedMemoRect({ x, y, width, height }, { ...size, side: "bottom" })
      const left = attachedMemoRect({ x, y, width, height }, { ...size, side: "left" })
      const right = attachedMemoRect({ x, y, width, height }, { ...size, side: "right" })

      for (const memo of [top, bottom, left, right]) {
        assert.deepEqual({ width: memo.width, height: memo.height }, size)
      }
      assert.deepEqual([top.x + top.width / 2, top.y + top.height], [centerX, y])
      assert.deepEqual([bottom.x + bottom.width / 2, bottom.y], [centerX, y + height])
      assert.deepEqual([left.x + left.width, left.y + left.height / 2], [x, centerY])
      assert.deepEqual([right.x, right.y + right.height / 2], [x + width, centerY])
    }
  }
})
