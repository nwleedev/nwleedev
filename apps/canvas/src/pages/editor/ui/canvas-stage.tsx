import { Button } from "react-aria-components/Button"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Group, Layer, Stage } from "react-konva"

import { readMemoBodies, type PlacementGeometry, type ProjectDocument, type Size } from "@/entities/project"

import { Choice } from "@/shared/ui"

import type { Region } from "../model/export-request"
import { RegionPicker } from "./region-picker"
import { useViewport } from "../model/use-viewport"
import { CanvasAsset } from "./canvas-asset"

type Props = {
  document: ProjectDocument
  zoomHost: HTMLDivElement | null
  selection?: Region["kind"]
  onRegion: (region: Region) => void
  selectedId?: string
  onSelect: (id: string | undefined) => void
  onEdit: (id: string, change: PlacementGeometry) => Promise<void>
  onResizeMemo: (id: string, size: Size) => Promise<void>
}

const inputOptions = { mouse: "마우스", trackpad: "터치패드" }

export function CanvasStage({ document, zoomHost, selection, onRegion, selectedId, onSelect, onEdit, onResizeMemo }: Props) {
  const viewport = useViewport(selectedId, onSelect)
  const container = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size>()
  const assets = new Map(document.assets.map((asset) => [asset.id, asset]))
  const memos = new Map(document.memos.map((memo) => [memo.placementId, memo]))
  const bodies = useMemo(() => readMemoBodies(document.memoUpdates), [document.memoUpdates])

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
        <Button type="button" aria-pressed={viewport.hand} onPress={() => viewport.setHand(!viewport.hand)}>화면 이동</Button>
        <Button type="button" onPress={viewport.fit}>전체 보기</Button>
        <Choice label="캔버스 입력 방식" hideLabel value={viewport.input}
          options={inputOptions} onChange={viewport.setInput} />
      </div>
      {zoomHost && createPortal(
        <div className="editor-zoom" role="group" aria-label="캔버스 확대 및 축소">
          <Button type="button" aria-label="축소" onPress={() => viewport.zoom(false)}>−</Button>
          <output aria-label="확대율">{Math.round(viewport.view.scale * 100)}%</output>
          <Button type="button" aria-label="확대" onPress={() => viewport.zoom(true)}>+</Button>
        </div>,
        zoomHost,
      )}
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
                        key={`${placement.id}:${asset.id}`}
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
