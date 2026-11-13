type Rect = { x: number; y: number; width: number; height: number }

export const maximumExportMargin = 24
export const maximumExportBytes = 64 * 1024 ** 2

const maximumExportDimension = 12_288
const maximumExportPixels = 28_000_000

export function exportBounds(rectangles: readonly Rect[], margin: number): Rect | undefined {
  if (rectangles.length === 0) return undefined

  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity

  for (const rectangle of rectangles) {
    const rectangleRight = rectangle.x + rectangle.width
    const rectangleBottom = rectangle.y + rectangle.height

    left = Math.min(left, rectangle.x)
    top = Math.min(top, rectangle.y)
    right = Math.max(right, rectangleRight)
    bottom = Math.max(bottom, rectangleBottom)
  }

  const x = Math.floor(left) - margin
  const y = Math.floor(top) - margin
  const outerRight = Math.ceil(right) + margin
  const outerBottom = Math.ceil(bottom) + margin

  return {
    x,
    y,
    width: outerRight - x,
    height: outerBottom - y,
  }
}

export function fitsOutput({ width, height }: Rect): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false
  if (width <= 0 || height <= 0) return false
  if (width > maximumExportDimension || height > maximumExportDimension) return false
  return width * height <= maximumExportPixels
}
