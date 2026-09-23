import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  NOTE_CANVAS_SIZE,
  NOTE_HEIGHT_MAX,
  NOTE_HEIGHT_MIN,
  NOTE_WIDTH_MAX,
  NOTE_WIDTH_MIN,
} from "./note"

import {
  findNewNoteGeometry,
  readNoteGeometryDraft,
  validateAndClampNoteGeometry,
} from "./note-geometry"

describe("메모 속성 입력", () => {
  it("허용된 크기와 캔버스 바깥 좌표를 입력한 그대로 저장한다", () => {
    fc.assert(fc.property(
      fc.record({
        height: fc.integer({ min: NOTE_HEIGHT_MIN, max: NOTE_HEIGHT_MAX }),
        width: fc.integer({ min: NOTE_WIDTH_MIN, max: NOTE_WIDTH_MAX }),
        x: fc.integer({ min: -NOTE_CANVAS_SIZE - 1, max: NOTE_CANVAS_SIZE + 1 }),
        y: fc.integer({ min: -NOTE_CANVAS_SIZE - 1, max: NOTE_CANVAS_SIZE + 1 }),
        zIndex: fc.integer({ min: 1, max: NOTE_CANVAS_SIZE }),
      }),
      (geometry) => {
        expect(readNoteGeometryDraft({
          height: String(geometry.height),
          width: String(geometry.width),
          x: String(geometry.x),
          y: String(geometry.y),
        }, geometry.zIndex)).toEqual({ geometry, status: "valid" })
      },
    ))
  })

  it("크기 한계를 벗어나거나 완성되지 않은 입력은 저장하지 않는다", () => {
    fc.assert(fc.property(
      fc.constantFrom(
        ["width", NOTE_WIDTH_MIN - 1] as const,
        ["width", NOTE_WIDTH_MAX + 1] as const,
        ["height", NOTE_HEIGHT_MIN - 1] as const,
        ["height", NOTE_HEIGHT_MAX + 1] as const,
      ),
      ([field, value]) => {
        const draft = {
          height: String(NOTE_HEIGHT_MIN),
          width: String(NOTE_WIDTH_MIN),
          x: "0",
          y: "0",
        }
        expect(readNoteGeometryDraft({
          ...draft,
          [field]: String(value),
        }, 1).status).toBe("invalid")
      },
    ))

    fc.assert(fc.property(
      fc.constantFrom("height", "width", "x", "y"),
      fc.constantFrom("", "문자", "Infinity"),
      (field, value) => {
        const draft = {
          height: String(NOTE_HEIGHT_MIN),
          width: String(NOTE_WIDTH_MIN),
          x: "0",
          y: "0",
        }
        expect(readNoteGeometryDraft({
          ...draft,
          [field]: value,
        }, 1).status).toBe("invalid")
      },
    ))
  })
})

describe("기존 메모 크기 보정", () => {
  it("크기만 허용 값으로 제한하고 위치는 유지한다", () => {
    fc.assert(fc.property(
      fc.record({
        height: fc.integer({ min: 1, max: NOTE_HEIGHT_MAX + 100 }),
        width: fc.integer({ min: 1, max: NOTE_WIDTH_MAX + 100 }),
        x: fc.integer({ min: -NOTE_CANVAS_SIZE, max: NOTE_CANVAS_SIZE }),
        y: fc.integer({ min: -NOTE_CANVAS_SIZE, max: NOTE_CANVAS_SIZE }),
        zIndex: fc.integer({ min: 1, max: NOTE_CANVAS_SIZE }),
      }),
      (geometry) => {
        const adjusted = validateAndClampNoteGeometry(geometry)
        expect(adjusted.width).toBe(Math.min(
          Math.max(geometry.width, NOTE_WIDTH_MIN), NOTE_WIDTH_MAX,
        ))
        expect(adjusted.height).toBe(Math.min(
          Math.max(geometry.height, NOTE_HEIGHT_MIN), NOTE_HEIGHT_MAX,
        ))
        expect({ x: adjusted.x, y: adjusted.y, zIndex: adjusted.zIndex })
          .toEqual({ x: geometry.x, y: geometry.y, zIndex: geometry.zIndex })
      },
    ))
  })

  it("유한하지 않은 좌표를 임의 값으로 바꾸지 않는다", () => {
    expect(() =>
      validateAndClampNoteGeometry({
        height: 240,
        width: 320,
        x: Number.NaN,
        y: 20,
        zIndex: 1,
      }),
    ).toThrow(TypeError)
  })
})

describe("새 메모 기본 배치", () => {
  it("두 열이 찬 뒤에도 캔버스 안의 다음 빈 위치를 찾는다", () => {
    const existingGeometry = Array.from({ length: 30 }, (_, index) => ({
      height: 240,
      width: 320,
      x: 32 + (index % 2) * 352,
      y: 32 + Math.floor(index / 2) * 272,
      zIndex: index + 1,
    }))

    const geometry = findNewNoteGeometry(existingGeometry)

    expect(geometry.x).toBeGreaterThan(384)
    expect(geometry.x + geometry.width).toBeLessThanOrEqual(4096)
    expect(geometry.y + geometry.height).toBeLessThanOrEqual(4096)
    expect(geometry.zIndex).toBe(31)
  })

  it("기본 배치가 모두 사용된 뒤에도 유효한 캔버스 위치를 반환한다", () => {
    const existingGeometry = Array.from({ length: 165 }, (_, index) => ({
      height: 240,
      width: 320,
      x: 32 + (index % 11) * 352,
      y: 32 + Math.floor(index / 11) * 272,
      zIndex: index + 1,
    }))

    const geometry = findNewNoteGeometry(existingGeometry)

    expect(geometry.x).toBeGreaterThanOrEqual(1)
    expect(geometry.y).toBeGreaterThanOrEqual(1)
    expect(geometry.x + geometry.width).toBeLessThanOrEqual(4096)
    expect(geometry.y + geometry.height).toBeLessThanOrEqual(4096)
  })
})
