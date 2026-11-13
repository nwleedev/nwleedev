export type Point = {
  x: number
  y: number
}

export type Viewport = Point & {
  scale: number
}

export const initialViewport: Viewport = {
  x: 0,
  y: 0,
  scale: 1,
}

export function zoomAt(view: Viewport, point: Point, scale: number): Viewport {
  const documentX = (point.x - view.x) / view.scale
  const documentY = (point.y - view.y) / view.scale

  return {
    x: point.x - documentX * scale,
    y: point.y - documentY * scale,
    scale,
  }
}

export function touchDragTarget(
  selectedId: string | null,
  hitId: string | null,
  handMode: boolean,
): "asset" | "viewport" {
  if (handMode || selectedId === null) return "viewport"
  if (selectedId !== hitId) return "viewport"
  return "asset"
}
