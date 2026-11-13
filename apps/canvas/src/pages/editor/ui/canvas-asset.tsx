import { useEffect, useState } from "react"
import { Group, Image, Rect, Text } from "react-konva"

import { attachedMemoRect, imageSizeAtWidth, type Asset, type Memo, type Placement, type PlacementGeometry, type Size } from "@/entities/project"

const handleRadius = 5
const minimumWidth = 1

type Props = {
  asset: Asset
  placement: Placement
  memo?: Memo
  memoBody: string
  selected: boolean
  onSelect: (id: string) => void
  onEdit: (id: string, change: PlacementGeometry) => Promise<void>
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

export function CanvasAsset({ asset, placement, memo, memoBody, selected, onSelect, onEdit }: Props) {
  const image = useOriginal(asset.original)
  const [preview, setPreview] = useState<Size>()
  const { id, x, y } = placement
  const { width, height } = preview ?? placement
  const note = memo && attachedMemoRect({ x: 0, y: 0, width, height }, memo)
  const theme = getComputedStyle(document.documentElement)
  const accent = theme.getPropertyValue("--accent").trim()

  function resize(position: { x: number; y: number }) {
    const ratio = asset.originalHeight / asset.originalWidth
    const projectedWidth = (position.x + position.y * ratio) / (1 + ratio ** 2)
    return imageSizeAtWidth(asset, Math.max(minimumWidth, projectedWidth))
  }

  return (
    <Group x={x} y={y}>
      <Group
        draggable
        onPointerDown={() => onSelect(id)}
        onDragStart={() => onSelect(id)}
        onDragEnd={(event) => {
          const node = event.target
          const offset = node.position()
          node.position({ x: 0, y: 0 })
          void onEdit(id, { kind: "position", x: x + offset.x, y: y + offset.y })
        }}
      >
        <Image image={image} width={width} height={height} />
        {selected && <Rect width={width} height={height} stroke={accent} listening={false} />}
        {note && (
          <>
            <Rect {...note} fill={theme.getPropertyValue("--surface").trim()} listening={false} />
            <Text {...note} text={memoBody} fill={theme.getPropertyValue("--text").trim()} listening={false} />
          </>
        )}
      </Group>
      {selected && (
        <Rect
          x={width}
          y={height}
          width={handleRadius * 2}
          height={handleRadius * 2}
          offsetX={handleRadius}
          offsetY={handleRadius}
          fill={theme.getPropertyValue("--surface").trim()}
          stroke={accent}
          draggable
          onDragMove={({ target }) => {
            const next = resize(target.position())
            target.position({ x: next.width, y: next.height })
            setPreview(next)
          }}
          onDragEnd={({ target }) => {
            const next = resize(target.position())
            void onEdit(id, { kind: "size", ...next }).finally(() => setPreview(undefined))
          }}
        />
      )}
    </Group>
  )
}
