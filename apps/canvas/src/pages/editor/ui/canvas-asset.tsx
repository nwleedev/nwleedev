import { useEffect, useState } from "react"
import { Group, Image, Rect, Text } from "react-konva"

import { attachedMemoRect, type Asset, type Memo, type Placement } from "@/entities/project"

type Props = {
  asset: Asset
  placement: Placement
  memo?: Memo
  memoBody: string
  selected: boolean
  onSelect: (id: string) => void
  onMove: (id: string, position: Pick<Placement, "x" | "y">) => Promise<void>
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

export function CanvasAsset({ asset, placement, memo, memoBody, selected, onSelect, onMove }: Props) {
  const image = useOriginal(asset.original)
  const { id, x, y, width, height } = placement
  const note = memo && attachedMemoRect({ x: 0, y: 0, width, height }, memo)
  const theme = getComputedStyle(document.documentElement)

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
          void onMove(id, { x: x + offset.x, y: y + offset.y })
        }}
      >
        <Image image={image} width={width} height={height} />
        {selected && <Rect width={width} height={height} stroke={theme.getPropertyValue("--accent").trim()} listening={false} />}
        {note && (
          <>
            <Rect {...note} fill={theme.getPropertyValue("--surface").trim()} listening={false} />
            <Text {...note} text={memoBody} fill={theme.getPropertyValue("--text").trim()} listening={false} />
          </>
        )}
      </Group>
    </Group>
  )
}
