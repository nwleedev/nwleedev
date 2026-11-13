import { useRef, useState, type PointerEvent } from "react"

import type { Region } from "../model/export-request"
import type { Point, Viewport } from "../model/viewport"

type Props = { kind: Region["kind"]; view: Viewport; choose: (region: Region) => void }

export function RegionPicker({ kind, view, choose }: Props) {
  const active = useRef<number | undefined>(undefined)
  const [points, setPoints] = useState<Point[]>([])
  const latest = useRef<Point[]>([])

  function point(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }

  function update(next: Point[]) {
    latest.current = next
    setPoints(next)
  }

  function extend(end: Point) {
    const start = latest.current[0]
    if (!start) return []
    return kind === "freehand" ? [...latest.current, end] : [start, end]
  }

  const [start] = points
  const end = points.at(-1)
  const width = start && end ? Math.abs(end.x - start.x) : 0
  const height = start && end ? Math.abs(end.y - start.y) : 0

  return <svg
    className="export-region-picker"
    role="img"
    aria-label="내보낼 영역 그리기"
    onPointerDown={(event) => {
      if (active.current !== undefined || event.button !== 0) return
      active.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
      update([point(event)])
    }}
    onPointerMove={(event) => {
      if (active.current === event.pointerId) update(extend(point(event)))
    }}
    onPointerUp={(event) => {
      if (active.current !== event.pointerId) return
      const next = extend(point(event))
      active.current = undefined
      update([])
      choose({
        kind,
        points: next.map(({ x, y }) => ({ x: (x - view.x) / view.scale, y: (y - view.y) / view.scale })),
      })
    }}
    onPointerCancel={() => {
      active.current = undefined
      update([])
    }}
  >
    {start && end && kind === "rectangle" && <rect x={Math.min(start.x, end.x)} y={Math.min(start.y, end.y)} width={width} height={height} />}
    {start && end && kind === "ellipse" && <ellipse cx={(start.x + end.x) / 2} cy={(start.y + end.y) / 2} rx={width / 2} ry={height / 2} />}
    {kind === "freehand" && <polygon points={points.map(({ x, y }) => `${x},${y}`).join(" ")} />}
  </svg>
}
