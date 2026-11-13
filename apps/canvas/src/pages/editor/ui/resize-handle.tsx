import { Rect } from "react-konva"

type Point = { x: number; y: number }

const radius = 5

export function ResizeHandle({ point, fill, stroke, onPreview, onCommit }: {
  point: Point
  fill: string
  stroke: string
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
      draggable
      onDragMove={({ target }) => target.position(onPreview(target.position()))}
      onDragEnd={({ target }) => onCommit(target.position())}
    />
  )
}
