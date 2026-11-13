import { readMemoBodies, type Memo, type Placement, type ProjectDocument } from "@/entities/project"

export const manifestName = "manifest.json"
export const format = "nwlee.canvas"
export const version = 1

export type Manifest = {
  format: typeof format
  version: typeof version
  title: string
  assets: readonly { id: string; mimeType: string; originalWidth: number; originalHeight: number }[]
  placements: readonly Omit<Placement, "projectId">[]
  memos: readonly (Memo & { body: string })[]
}

export function originalEntry(index: number) {
  return `originals/${index}`
}

export function buildManifest(document: ProjectDocument): Manifest {
  const bodies = readMemoBodies(document.memoUpdates)

  return {
    format,
    version,
    title: document.project.title,
    assets: document.assets.map(({ id, mimeType, originalWidth, originalHeight }) => ({
      id, mimeType, originalWidth, originalHeight,
    })),
    placements: document.placements.map(({ id, assetId, x, y, width, height, zIndex, quality }) => ({
      id, assetId, x, y, width, height, zIndex, quality,
    })),
    memos: document.memos.map((memo) => ({ ...memo, body: bodies.get(memo.id) ?? "" })),
  }
}
