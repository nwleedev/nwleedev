import { validatePlacementGeometry, validateSize, type Asset, type MemoUpdate, type ProjectDocument } from "@/entities/project"

const minimumQuality = 0
export const maximumQuality = 100
export const memoSides = ["top", "right", "bottom", "left"] as const

export function validateDocument(document: ProjectDocument) {
  const { project, assets, placements, memos, memoUpdates } = document
  const originals = new Map(assets.map((asset) => [asset.id, asset]))
  const placementIds = new Set(placements.map(({ id }) => id))

  for (const asset of assets) validateAsset(asset, project.id)

  for (const placement of placements) {
    const asset = originals.get(placement.assetId)
    if (!asset || placement.projectId !== project.id) throw new Error("Invalid placement reference")
    validatePlacementGeometry(placement, asset)
    const { zIndex, quality } = placement
    if (
      !Number.isSafeInteger(zIndex) ||
      !Number.isInteger(quality) || quality < minimumQuality || quality > maximumQuality
    ) throw new Error("Invalid placement order or quality")
  }

  for (const memo of memos) {
    if (
      !placementIds.has(memo.placementId) ||
      !memoSides.includes(memo.side)
    ) throw new Error("Invalid memo")
    validateSize(memo)
  }
  const memoIds = new Set(memos.map(({ id }) => id))
  for (const update of memoUpdates) {
    validateMemoUpdate(update)
    if (!memoIds.has(update.memoId)) throw new Error("Invalid memo update reference")
  }
}

export function validateAsset(asset: Asset, projectId: string) {
  if (
    asset.projectId !== projectId || !(asset.original instanceof Blob) ||
    !Number.isSafeInteger(asset.originalWidth) || asset.originalWidth <= 0 ||
    !Number.isSafeInteger(asset.originalHeight) || asset.originalHeight <= 0
  ) throw new Error("Invalid project asset")
}

export function validateMemoUpdate(update: MemoUpdate) {
  if (!(update.payload instanceof Uint8Array) || !update.payload.length || !update.updateId) {
    throw new Error("Invalid memo update")
  }
}
