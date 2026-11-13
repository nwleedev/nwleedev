import assert from "node:assert/strict"
import { test } from "node:test"

import { attachedMemoRect, imageSizeAtWidth } from "../src/entities/project/model/geometry.ts"

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
