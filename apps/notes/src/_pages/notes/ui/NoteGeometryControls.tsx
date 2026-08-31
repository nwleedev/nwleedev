import type { FormEvent } from "react"

import type { NoteGeometry } from "@/entities/note"
import { Button } from "@/shared/ui/button"
import { TextField } from "@/shared/ui/text-field"

type GeometryField = keyof Pick<NoteGeometry, "height" | "width" | "x" | "y">

type NoteGeometryControlsProps = {
  geometry: NoteGeometry
  pending: boolean
  onChange(geometry: NoteGeometry): void
  onCommit(geometry: NoteGeometry): Promise<void>
}

function normalizeGeometryValue(field: GeometryField, value: number) {
  if (field === "width") {
    return Math.max(240, value)
  }

  if (field === "height") {
    return Math.max(180, value)
  }

  return Math.max(0, value)
}

export function NoteGeometryControls({
  geometry,
  onChange,
  onCommit,
  pending,
}: NoteGeometryControlsProps) {
  function updateField(field: GeometryField, value: number) {
    if (!Number.isFinite(value)) {
      return
    }

    onChange({
      ...geometry,
      [field]: normalizeGeometryValue(field, value),
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onCommit(geometry)
  }

  function commitGeometry() {
    void onCommit(geometry)
  }

  return (
    <form
      aria-label="메모 위치와 크기"
      className="grid grid-cols-2 gap-2 border-t border-line pt-3"
      onSubmit={handleSubmit}
    >
      <label className="grid gap-1 text-xs font-semibold text-soft-ink">
        가로 위치
        <TextField
          disabled={pending}
          min="0"
          onChange={(event) => updateField("x", event.currentTarget.valueAsNumber)}
          step="10"
          type="number"
          value={geometry.x}
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-soft-ink">
        세로 위치
        <TextField
          disabled={pending}
          min="0"
          onChange={(event) => updateField("y", event.currentTarget.valueAsNumber)}
          step="10"
          type="number"
          value={geometry.y}
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-soft-ink">
        너비
        <TextField
          disabled={pending}
          min="240"
          onChange={(event) =>
            updateField("width", event.currentTarget.valueAsNumber)
          }
          step="10"
          type="number"
          value={geometry.width}
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-soft-ink">
        높이
        <TextField
          disabled={pending}
          min="180"
          onChange={(event) =>
            updateField("height", event.currentTarget.valueAsNumber)
          }
          step="10"
          type="number"
          value={geometry.height}
        />
      </label>
      <Button
        className="col-span-2"
        disabled={pending}
        onClick={commitGeometry}
      >
        배치 적용
      </Button>
    </form>
  )
}
