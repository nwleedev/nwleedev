import { Rect } from "react-konva"

type Point = { x: number; y: number }

const radius = 5

export function ResizeHandle({ point, fill, stroke, draggable, dragCancelled, onCancel, onPreview, onCommit }: {
  point: Point
  fill: string
  stroke: string
  draggable: boolean
  dragCancelled: () => boolean
  onCancel: () => void
  onPreview: (point: Point) => Point
  onCommit: (point: Point) => void
}) {
  return (
    <Rect
      {...point}
      width={radius * 2}
      height={radius * 2}
      offsetX={radius}
      offsetY={radius}
      fill={fill}
      stroke={stroke}
      name="resize-handle"
      draggable={draggable}
      onDragMove={({ target }) => target.position(onPreview(target.position()))}
      onDragEnd={({ target }) => {
        if (dragCancelled()) {
          target.position(point)
          onCancel()
        } else onCommit(target.position())
      }}
    />
  )
}
