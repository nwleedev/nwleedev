import type { Memo, Rect } from "@/entities/project"

const minimumSize = 1

export function memoCorner(rect: Rect, side: Memo["side"]) {
  return {
    x: side === "left" ? rect.x : rect.x + rect.width,
    y: side === "top" ? rect.y : rect.y + rect.height,
  }
}

export function memoSizeAtCorner(image: Rect, side: Memo["side"], point: { x: number; y: number }) {
  const horizontal = side === "left" || side === "right"
  const width = horizontal
    ? side === "left" ? image.x - point.x : point.x - (image.x + image.width)
    : (point.x - image.x) * 2 - image.width
  const height = horizontal
    ? (point.y - image.y) * 2 - image.height
    : side === "top" ? image.y - point.y : point.y - (image.y + image.height)
  return { width: Math.max(minimumSize, width), height: Math.max(minimumSize, height) }
}
