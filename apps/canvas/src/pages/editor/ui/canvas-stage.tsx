import { useEffect, useMemo, useRef, useState } from "react"
import { Group, Layer, Stage } from "react-konva"

import { createMemoText, type PlacementGeometry, type ProjectDocument, type Size } from "@/entities/project"

import type { Region } from "../model/export-request"
import { RegionPicker } from "./region-picker"
import { useViewport } from "../model/use-viewport"
import { CanvasAsset } from "./canvas-asset"

type Props = {
  document: ProjectDocument
  selection?: Region["kind"]
  onRegion: (region: Region) => void
  selectedId?: string
  onSelect: (id: string | undefined) => void
  onEdit: (id: string, change: PlacementGeometry) => Promise<void>
  onResizeMemo: (id: string, size: Size) => Promise<void>
}

export function CanvasStage({ document, selection, onRegion, selectedId, onSelect, onEdit, onResizeMemo }: Props) {
  const viewport = useViewport(selectedId, onSelect)
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
      <div className="canvas-navigation" role="group" aria-label="캔버스 화면 조작">
        <button type="button" aria-pressed={viewport.hand} onClick={() => viewport.setHand(!viewport.hand)}>화면 이동</button>
        <button type="button" aria-label="축소" onClick={() => viewport.zoom(false)}>−</button>
        <output aria-label="확대율">{Math.round(viewport.view.scale * 100)}%</output>
        <button type="button" aria-label="확대" onClick={() => viewport.zoom(true)}>+</button>
        <button type="button" onClick={viewport.fit}>전체 보기</button>
        <select aria-label="캔버스 입력 방식" value={viewport.input} onChange={({ currentTarget }) => viewport.setInput(currentTarget.value === "trackpad" ? "trackpad" : "mouse")}>
          <option value="mouse">마우스</option>
          <option value="trackpad">터치패드</option>
        </select>
      </div>
      {size && (
        <div
          className="editor-stage"
          tabIndex={0}
          aria-label="캔버스 작업 영역"
          onPointerDownCapture={(event) => {
            event.currentTarget.focus({ preventScroll: true })
            viewport.down(event)
          }}
          onPointerMoveCapture={viewport.move}
          onPointerUpCapture={viewport.end}
          onPointerCancelCapture={viewport.end}
          onLostPointerCapture={viewport.end}
          onBlur={() => viewport.setSpace(false)}
          onKeyDown={(event) => {
            if (event.code === "Space") {
              event.preventDefault()
              viewport.setSpace(true)
            }
          }}
          onKeyUp={(event) => {
            if (event.code === "Space") viewport.setSpace(false)
          }}
        >
          <Stage ref={viewport.stage} {...size} onWheel={({ evt }) => viewport.wheel(evt)}>
            <Layer>
              <Group ref={viewport.scene} x={viewport.view.x} y={viewport.view.y} scaleX={viewport.view.scale} scaleY={viewport.view.scale}>
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
                        movable={!viewport.hand}
                        dragCancelled={viewport.dragCancelled}
                        onSelect={onSelect}
                        onEdit={onEdit}
                        onResizeMemo={onResizeMemo}
                      />
                    )
                  })}
              </Group>
            </Layer>
          </Stage>
        </div>
      )}
      {selection && <RegionPicker key={selection} kind={selection} view={viewport.view} choose={onRegion} />}
    </div>
  )
}
