import { memoSides } from "../validate-document"
import type { Manifest } from "./manifest"

function fields(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid manifest record")
  return value as Record<string, unknown>
}

function string(value: unknown) {
  if (typeof value !== "string") throw new Error("Invalid manifest text")
  return value
}

function number(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid manifest number")
  return value
}

function records(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Invalid manifest collection")
  return value.map(fields)
}

function unique(values: readonly string[]) {
  if (new Set(values).size !== values.length) throw new Error("Duplicate manifest identifier")
}

export function parseManifest(value: unknown, format: Manifest["format"], version: Manifest["version"]): Manifest {
  const root = fields(value)
  if (root.format !== format) throw new Error("Invalid project format")
  if (root.version !== version) throw new Error("Unsupported project version")

  const assets = records(root.assets).map((asset) => ({
    id: string(asset.id),
    mimeType: string(asset.mimeType),
    originalWidth: number(asset.originalWidth),
    originalHeight: number(asset.originalHeight),
  }))
  const placements = records(root.placements).map((placement) => ({
    id: string(placement.id),
    assetId: string(placement.assetId),
    x: number(placement.x),
    y: number(placement.y),
    width: number(placement.width),
    height: number(placement.height),
    zIndex: number(placement.zIndex),
    quality: number(placement.quality),
  }))
  const memos = records(root.memos).map((memo) => {
    const side = memoSides.find((candidate) => candidate === memo.side)
    if (!side) throw new Error("Invalid memo side")
    return {
      id: string(memo.id),
      placementId: string(memo.placementId),
      width: number(memo.width),
      height: number(memo.height),
      body: string(memo.body),
      side,
    }
  })
  unique(assets.map(({ id }) => id))
  unique(placements.map(({ id }) => id))
  unique(memos.map(({ id }) => id))
  unique(memos.map(({ placementId }) => placementId))
  return { format, version, title: string(root.title), assets, placements, memos }
}
