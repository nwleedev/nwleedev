import type { Asset, Memo, Placement } from "./records"

const aspectRatioTolerance = 1e-9

export type Size = Pick<Placement, "width" | "height">

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

export function applyPlacementGeometry(placement: Placement, change: PlacementGeometry): Placement {
  if (change.kind === "position") return { ...placement, x: change.x, y: change.y }
  return { ...placement, width: change.width, height: change.height }
}

export function resizeMemo(memo: Memo, size: Size): Memo {
  validateSize(size)
  return { ...memo, width: size.width, height: size.height }
}
