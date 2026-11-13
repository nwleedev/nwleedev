import assert from "node:assert/strict"
import { test } from "node:test"

import { touchDragTarget, zoomAt } from "../src/pages/editor/model/viewport.ts"

test("zoom keeps the document point under the pointer fixed after the view moves", () => {
  const view = { x: 60, y: -30, scale: 2 }
  const pointer = { x: 180, y: 90 }
  const documentPoint = {
    x: (pointer.x - view.x) / view.scale,
    y: (pointer.y - view.y) / view.scale,
  }

  const zoomed = zoomAt(view, pointer, 3)

  assert.deepEqual(zoomed, { x: 0, y: -90, scale: 3 })
  assert.equal((pointer.x - zoomed.x) / zoomed.scale, documentPoint.x)
  assert.equal((pointer.y - zoomed.y) / zoomed.scale, documentPoint.y)
  assert.deepEqual(view, { x: 60, y: -30, scale: 2 })
})

test("zoom uses the requested absolute scale when zooming out around an off-center point", () => {
  const view = { x: 15, y: -20, scale: 0.5 }
  const pointer = { x: -85, y: 30 }

  const zoomed = zoomAt(view, pointer, 0.25)

  assert.deepEqual(zoomed, { x: -35, y: 5, scale: 0.25 })
  assert.equal((pointer.x - zoomed.x) / zoomed.scale, -200)
  assert.equal((pointer.y - zoomed.y) / zoomed.scale, 100)
})

test("touch drag moves only the selected image when the hand tool is inactive", () => {
  assert.equal(touchDragTarget("image-a", "image-a", false), "asset")
  assert.equal(touchDragTarget("image-a", "image-b", false), "viewport")
  assert.equal(touchDragTarget("image-a", null, false), "viewport")
})

test("touch drag pans the view when no image is selected or the hand tool is active", () => {
  assert.equal(touchDragTarget(null, "image-a", false), "viewport")
  assert.equal(touchDragTarget(null, null, false), "viewport")
  assert.equal(touchDragTarget("image-a", "image-a", true), "viewport")
})
