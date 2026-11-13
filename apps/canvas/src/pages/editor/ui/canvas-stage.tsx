import { useEffect, useMemo, useRef, useState } from "react"
import { Layer, Stage } from "react-konva"

import { createMemoText, type Placement, type ProjectDocument, type Size } from "@/entities/project"

import { CanvasAsset } from "./canvas-asset"

type Props = {
  document: ProjectDocument
  selectedId?: string
  onSelect: (id: string) => void
  onMove: (id: string, position: Pick<Placement, "x" | "y">) => Promise<void>
}

export function CanvasStage({ document, selectedId, onSelect, onMove }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size>()
  const assets = new Map(document.assets.map((asset) => [asset.id, asset]))
  const memos = new Map(document.memos.map((memo) => [memo.placementId, memo]))
  const bodies = useMemo(() => {
    const updates = new Map<string, Uint8Array[]>()
    for (const { memoId, payload } of document.memoUpdates) {
      const list = updates.get(memoId)
      if (list) list.push(payload)
      else updates.set(memoId, [payload])
    }
    const result = new Map<string, string>()
    for (const [id, payloads] of updates) {
      const text = createMemoText(payloads)
      result.set(id, text.read())
      text.destroy()
    }
    return result
  }, [document.memoUpdates])

  useEffect(() => {
    if (!container.current) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={container} className="editor-canvas" aria-label="캔버스" role="region">
      {size && (
        <Stage {...size} className="editor-stage">
          <Layer>
            {document.placements.map((placement) => {
              const asset = assets.get(placement.assetId)
              const memo = memos.get(placement.id)
              if (!asset) return null
              return (
                <CanvasAsset
                  key={placement.id}
                  asset={asset}
                  placement={placement}
                  memo={memo}
                  memoBody={memo ? bodies.get(memo.id) ?? "" : ""}
                  selected={selectedId === placement.id}
                  onSelect={onSelect}
                  onMove={onMove}
                />
              )
            })}
          </Layer>
        </Stage>
      )}
    </div>
  )
}
