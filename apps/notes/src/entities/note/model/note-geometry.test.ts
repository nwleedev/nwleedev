import { describe, expect, it } from "vitest"

import {
  findNewNoteGeometry,
  fitNoteGeometryToCanvas,
  readNoteGeometryDraft,
} from "./note-geometry"

describe("메모 속성 입력", () => {
  it("허용 범위의 네 입력을 저장 geometry로 변환한다", () => {
    expect(
      readNoteGeometryDraft(
        { height: "360", width: "480", x: "120", y: "240" },
        3,
      ),
    ).toEqual({
      geometry: { height: 360, width: 480, x: 120, y: 240, zIndex: 3 },
      status: "valid",
    })
  })

  it("X와 Y의 음수, 0과 기존 캔버스 바깥 위치를 저장한다", () => {
    expect(
      readNoteGeometryDraft(
        { height: "360", width: "480", x: "-120", y: "5000" },
        3,
      ),
    ).toEqual({
      geometry: { height: 360, width: 480, x: -120, y: 5000, zIndex: 3 },
      status: "valid",
    })
  })

  it("너비와 높이가 4095이고 X와 Y가 1인 geometry를 저장한다", () => {
    expect(
      readNoteGeometryDraft(
        { height: "4095", width: "4095", x: "1", y: "1" },
        3,
      ),
    ).toEqual({
      geometry: { height: 4095, width: 4095, x: 1, y: 1, zIndex: 3 },
      status: "valid",
    })
  })

  it.each([
    { height: "360", width: "480", x: "", y: "240" },
    { height: "360", width: "480", x: "문자", y: "240" },
    { height: "360", width: "4096", x: "1", y: "240" },
  ])("완성되지 않았거나 범위를 벗어난 입력을 거절한다", (draft) => {
    expect(readNoteGeometryDraft(draft, 3).status).toBe("invalid")
  })
})

describe("기존 메모 크기 보정", () => {
  it("크기만 허용 범위로 맞추고 위치는 그대로 둔다", () => {
    expect(
      fitNoteGeometryToCanvas({
        height: 5000,
        width: 5000,
        x: 0,
        y: 3900,
        zIndex: 2,
      }),
    ).toEqual({
      height: 4095,
      width: 4095,
      x: 0,
      y: 3900,
      zIndex: 2,
    })
  })

  it("유한하지 않은 좌표를 임의 값으로 바꾸지 않는다", () => {
    expect(() =>
      fitNoteGeometryToCanvas({
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
