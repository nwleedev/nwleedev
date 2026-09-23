import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import type { NoteGeometry } from "@/entities/note"

import {
  revealNoteInView,
  zoomBoardView,
  type BoardRectangle,
  type BoardView,
} from "./board-view"

const viewportSize = fc.record({
  height: fc.integer({ min: 500, max: 1400 }),
  width: fc.integer({ min: 600, max: 1800 }),
})

describe("캔버스를 확대하거나 축소할 때", () => {
  it("포인터와 화면 중심 아래의 캔버스 위치를 유지한다", () => {
    fc.assert(
      fc.property(
        fc.record({
          anchorX: fc.integer({ min: 0, max: 1800 }),
          anchorY: fc.integer({ min: 0, max: 1400 }),
          originX: fc.integer({ min: -10000, max: 10000 }),
          originY: fc.integer({ min: -10000, max: 10000 }),
          scale: fc.double({ min: 0.1, max: 1.9, noNaN: true }),
          targetScale: fc.double({ min: 0.1, max: 2, noNaN: true }),
          x: fc.integer({ min: -2000, max: 2000 }),
          y: fc.integer({ min: -2000, max: 2000 }),
        }),
        ({ anchorX, anchorY, originX, originY, scale, targetScale, x, y }) => {
          const view = { originX, originY, scale, x, y }
          const anchor = { x: anchorX, y: anchorY }
          const worldX = originX + (anchor.x - view.x) / view.scale
          const worldY = originY + (anchor.y - view.y) / view.scale
          const result = zoomBoardView(view, targetScale, anchor)
          const projectedX = (worldX - result.originX) * result.scale + result.x
          const projectedY = (worldY - result.originY) * result.scale + result.y

          expect(projectedX).toBeCloseTo(anchor.x, 6)
          expect(projectedY).toBeCloseTo(anchor.y, 6)
          expect(result.originX).toBe(view.originX)
          expect(result.originY).toBe(view.originY)
        },
      ),
    )
  })

  it("맞춤 보기가 낮은 배율에서 축소 입력을 받아도 확대하지 않는다", () => {
    fc.assert(
      fc.property(
        fc.double({ min: Number.EPSILON, max: 0.09, noNaN: true }),
        (scale) => {
          const view = { ...defaultView, scale }
          const result = zoomBoardView(view, scale - 0.1, { x: 400, y: 300 })

          expect(result.scale).toBeLessThanOrEqual(scale)
          expect(result.scale).toBeGreaterThan(0)
        },
      ),
    )
  })

  it("큰 확대 입력 뒤에도 표시 가능한 배율을 유지한다", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 2.1, max: 100, noNaN: true }),
        (proposedScale) => {
          const result = zoomBoardView(
            defaultView,
            proposedScale,
            { x: 400, y: 300 },
          )

          expect(result.scale).toBeLessThanOrEqual(2)
          expect(result.scale).toBeGreaterThan(0)
        },
      ),
    )
  })
})

const defaultView: BoardView = {
  originX: 0,
  originY: 0,
  scale: 1,
  x: 0,
  y: 0,
}

function geometryAt(
  x: number,
  y: number,
  width: number,
  height: number,
): NoteGeometry {
  return { height, width, x, y, zIndex: 1 }
}

function visibleRectangle(view: BoardView, geometry: NoteGeometry) {
  const left = (geometry.x - view.originX) * view.scale + view.x
  const top = (geometry.y - view.originY) * view.scale + view.y

  return {
    bottom: top + geometry.height * view.scale,
    left,
    right: left + geometry.width * view.scale,
    top,
  }
}

function overlaps(left: BoardRectangle, right: BoardRectangle) {
  return (
    left.left < right.right &&
    left.right > right.left &&
    left.top < right.bottom &&
    left.bottom > right.top
  )
}

describe("캔버스에서 포커스 메모를 드러낼 때", () => {
  it("이미 보이는 메모의 화면 위치를 바꾸지 않는다", () => {
    fc.assert(
      fc.property(viewportSize, ({ height, width }) => {
        const geometry = geometryAt(
          width / 4,
          height / 4,
          width / 4,
          height / 4,
        )
        const result = revealNoteInView(
          defaultView,
          geometry,
          { height, width },
          null,
        )

        expect(visibleRectangle(result, geometry)).toEqual(
          visibleRectangle(defaultView, geometry),
        )
      }),
    )
  })

  it("화면 밖 메모의 시작 부분을 표시하면서 저장 좌표를 유지한다", () => {
    fc.assert(
      fc.property(viewportSize, ({ height, width }) => {
        const geometry = geometryAt(
          width * 2,
          height * 2,
          width / 3,
          height / 3,
        )
        const originalGeometry = { ...geometry }
        const result = revealNoteInView(
          defaultView,
          geometry,
          { height, width },
          null,
        )
        const visible = visibleRectangle(result, geometry)

        expect(visible.left).toBeGreaterThan(0)
        expect(visible.right).toBeLessThan(width)
        expect(visible.top).toBeGreaterThan(0)
        expect(visible.bottom).toBeLessThan(height)
        expect(geometry).toEqual(originalGeometry)
      }),
    )
  })

  it("보기 제어에 가린 메모를 제어 밖으로 옮긴다", () => {
    fc.assert(
      fc.property(viewportSize, ({ height, width }) => {
        const controls = {
          bottom: height,
          left: 0,
          right: width / 3,
          top: height * 0.8,
        }
        const geometry = geometryAt(
          width / 6,
          height * 0.7,
          width / 6,
          height / 6,
        )
        const result = revealNoteInView(
          defaultView,
          geometry,
          { height, width },
          controls,
        )

        expect(overlaps(visibleRectangle(result, geometry), controls)).toBe(false)
        expect(geometry.y).toBe(height * 0.7)
      }),
    )
  })

  it("화면보다 큰 메모는 크기를 바꾸지 않고 시작 부분을 드러낸다", () => {
    fc.assert(
      fc.property(viewportSize, ({ height, width }) => {
        const geometry = geometryAt(
          width * 2,
          height * 2,
          width * 1.5,
          height * 1.5,
        )
        const result = revealNoteInView(
          defaultView,
          geometry,
          { height, width },
          null,
        )
        const visible = visibleRectangle(result, geometry)

        expect(visible.left).toBeGreaterThan(0)
        expect(visible.left).toBeLessThan(width)
        expect(visible.top).toBeGreaterThan(0)
        expect(visible.top).toBeLessThan(height)
        expect(geometry.width).toBe(width * 1.5)
        expect(geometry.height).toBe(height * 1.5)
      }),
    )
  })
})
