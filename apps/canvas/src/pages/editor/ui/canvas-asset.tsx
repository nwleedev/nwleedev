import { useEffect, useState } from "react"
import { Group, Image, Rect, Text } from "react-konva"

import { attachedMemoRect, imageSizeAtWidth, type Asset, type Memo, type Placement, type PlacementGeometry, type Size } from "@/entities/project"

import { memoCorner, memoSizeAtCorner } from "../model/memo-resize"
import { ResizeHandle } from "./resize-handle"

const minimumWidth = 1

type Props = {
  asset: Asset
  placement: Placement
  memo?: Memo
  memoBody: string
  selected: boolean
  movable: boolean
  dragCancelled: () => boolean
  onSelect: (id: string) => void
  onEdit: (id: string, change: PlacementGeometry) => Promise<void>
  onResizeMemo: (id: string, size: Size) => Promise<void>
}

function useOriginal(original: Blob) {
  const [decoded, setDecoded] = useState<{ source: Blob; image: HTMLImageElement }>()

  useEffect(() => {
    const url = URL.createObjectURL(original)
    const image = new window.Image()
    image.onload = () => setDecoded({ source: original, image })
    image.src = url
    return () => {
      image.onload = null
      URL.revokeObjectURL(url)
    }
  }, [original])

  return decoded?.source === original ? decoded.image : undefined
}

export function CanvasAsset({ asset, placement, memo, memoBody, selected, movable, dragCancelled, onSelect, onEdit, onResizeMemo }: Props) {
  const image = useOriginal(asset.original)
  const [preview, setPreview] = useState<Size>()
  const [memoPreview, setMemoPreview] = useState<Size>()
  const { id, x, y } = placement
  const { width, height } = preview ?? placement
  const imageRect = { x: 0, y: 0, width, height }
  const note = memo && attachedMemoRect(imageRect, { ...memo, ...memoPreview })
  const theme = getComputedStyle(document.documentElement)
  const accent = theme.getPropertyValue("--accent").trim()
  const surface = theme.getPropertyValue("--surface").trim()

  function resize(position: { x: number; y: number }) {
    const ratio = asset.originalHeight / asset.originalWidth
    const projectedWidth = (position.x + position.y * ratio) / (1 + ratio ** 2)
    return imageSizeAtWidth(asset, Math.max(minimumWidth, projectedWidth))
  }

  return (
    <Group x={x} y={y}>
      <Group
        name="placement"
        id={id}
        draggable={movable}
        onPointerDown={({ evt }) => {
          if (movable && evt.pointerType !== "touch") onSelect(id)
        }}
        onDragStart={() => onSelect(id)}
        onDragEnd={(event) => {
          const node = event.target
          const offset = node.position()
          node.position({ x: 0, y: 0 })
          if (dragCancelled()) return
          void onEdit(id, { kind: "position", x: x + offset.x, y: y + offset.y })
        }}
      >
        <Image image={image} width={width} height={height} />
        {selected && <Rect width={width} height={height} stroke={accent} listening={false} />}
        {note && (
          <>
            <Rect {...note} fill={surface} listening={false} />
            <Text {...note} text={memoBody} fill={theme.getPropertyValue("--text").trim()} listening={false} />
          </>
        )}
      </Group>
      {selected && (
        <ResizeHandle
          point={{ x: width, y: height }}
          fill={surface}
          stroke={accent}
          draggable={movable}
          dragCancelled={dragCancelled}
          onCancel={() => setPreview(undefined)}
          onPreview={(point) => {
            const next = resize(point)
            setPreview(next)
            return { x: next.width, y: next.height }
          }}
          onCommit={(point) => {
            const next = resize(point)
            void onEdit(id, { kind: "size", ...next }).finally(() => setPreview(undefined))
          }}
        />
      )}
      {selected && memo && note && (
        <ResizeHandle
          point={memoCorner(note, memo.side)}
          fill={surface}
          stroke={accent}
          draggable={movable}
          dragCancelled={dragCancelled}
          onCancel={() => setMemoPreview(undefined)}
          onPreview={(point) => {
            const next = memoSizeAtCorner(imageRect, memo.side, point)
            setMemoPreview(next)
            return memoCorner(attachedMemoRect(imageRect, { side: memo.side, ...next }), memo.side)
          }}
          onCommit={(point) => {
            const next = memoSizeAtCorner(imageRect, memo.side, point)
            void onResizeMemo(memo.id, next).finally(() => setMemoPreview(undefined))
          }}
        />
      )}
    </Group>
  )
}
