import { attachedMemoRect, createMemoText, type ProjectDocument, type Rect } from "@/entities/project"

import { exportBounds } from "@/shared/export"
import type { Point } from "./viewport"

export type ExportFormat = "png" | "jpg" | "svg"
export type Region = { kind: "rectangle" | "ellipse" | "freehand"; points: readonly Point[] }
export type ExportImage = { id: string; rect: Rect; original: Blob; quality: number; memo?: { rect: Rect; body: string } }
export type ExportRequest = {
  bounds: Rect
  region?: Region
  format: ExportFormat
  quality: number
  images: readonly ExportImage[]
  ink: string
  paper: string
}
export type ExportResult = { blob?: Blob; previewBlob?: Blob; clippedMemo: boolean; transparent?: boolean }
export type RenderExport = (request: ExportRequest, signal: AbortSignal) => Promise<ExportResult>

export function exportImages(document: ProjectDocument): ExportImage[] {
  const assets = new Map(document.assets.map((asset) => [asset.id, asset]))
  const memos = new Map(document.memos.map((memo) => [memo.placementId, memo]))
  return [...document.placements].sort((a, b) => a.zIndex - b.zIndex).flatMap((placement) => {
    const asset = assets.get(placement.assetId)
    if (!asset) return []
    const { id, x, y, width, height, quality } = placement
    const rect = { x, y, width, height }
    const memo = memos.get(id)
    const item = { id, rect, original: asset.original, quality: quality / 100 }
    if (!memo) return [item]
    const text = createMemoText(document.memoUpdates.filter(({ memoId }) => memoId === memo.id).map(({ payload }) => payload))
    try {
      return [{ ...item, memo: { rect: attachedMemoRect(rect, memo), body: text.read() } }]
    } finally {
      text.destroy()
    }
  })
}

export function requestBounds(images: readonly ExportImage[], margin: number, region?: Region) {
  if (!region) return exportBounds(images.flatMap(({ rect, memo }) => memo ? [rect, memo.rect] : [rect]), margin)
  return exportBounds(region.points.map(({ x, y }) => ({ x, y, width: 0, height: 0 })), 0)
}

