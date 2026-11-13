import type { Asset, Memo, Placement } from "./records"

const aspectRatioTolerance = 1e-9

export type Size = Pick<Placement, "width" | "height">
export type Rect = Pick<Placement, "x" | "y"> & Size

export type PlacementGeometry =
  | ({ kind: "position" } & Pick<Placement, "x" | "y">)
  | ({ kind: "size" } & Size)

export function validateSize({ width, height }: Size) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Invalid size")
  }
}

export function validatePlacementGeometry(placement: Placement, asset: Asset) {
  validateSize(placement)
  const { x, y, width, height } = placement
  const expectedHeight = (width / asset.originalWidth) * asset.originalHeight
  if (
    !Number.isFinite(x) || !Number.isFinite(y) ||
    width > asset.originalWidth || height > asset.originalHeight ||
    Math.abs(height - expectedHeight) > expectedHeight * aspectRatioTolerance
  ) throw new Error("Invalid placement geometry")
}

export function imageSizeAtWidth(original: Pick<Asset, "originalWidth" | "originalHeight">, requestedWidth: number): Size {
  if (!Number.isFinite(requestedWidth) || requestedWidth <= 0) throw new Error("Invalid image width")
  const width = Math.min(requestedWidth, original.originalWidth)
  const height = (width / original.originalWidth) * original.originalHeight
  const size = { width, height }
  validateSize(size)
  return size
}

export function attachedMemoRect(image: Rect, memo: Size & Pick<Memo, "side">): Rect {
  const { width, height } = memo
  const centerX = image.x + (image.width - width) / 2
  const centerY = image.y + (image.height - height) / 2
  switch (memo.side) {
    case "top": return { x: centerX, y: image.y - height, width, height }
    case "right": return { x: image.x + image.width, y: centerY, width, height }
    case "bottom": return { x: centerX, y: image.y + image.height, width, height }
    case "left": return { x: image.x - width, y: centerY, width, height }
  }
}

export function applyPlacementGeometry(placement: Placement, change: PlacementGeometry): Placement {
  if (change.kind === "position") return { ...placement, x: change.x, y: change.y }
  return { ...placement, width: change.width, height: change.height }
}

export function resizeMemo(memo: Memo, size: Size): Memo {
  validateSize(size)
  return { ...memo, width: size.width, height: size.height }
}
