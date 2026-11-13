import { createMemoText, type Memo, type Placement, type ProjectDocument } from "@/entities/project"

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
  const updates = new Map<string, Uint8Array[]>()
  for (const { memoId, payload } of document.memoUpdates) {
    const group = updates.get(memoId)
    if (group) group.push(payload)
    else updates.set(memoId, [payload])
  }

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
    memos: document.memos.map((memo) => {
      const text = createMemoText(updates.get(memo.id))
      try {
        return { ...memo, body: text.read() }
      } finally {
        text.destroy()
      }
    }),
  }
}
