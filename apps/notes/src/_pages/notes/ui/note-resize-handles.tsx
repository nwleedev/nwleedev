import type { PointerEvent as ReactPointerEvent } from "react"

import { joinClassNames } from "@/shared/lib/join-class-names"

import { useNoteCardParts } from "../model/note-card-context"
import type { NoteResizeDirection } from "../model/use-note-geometry-gesture"

type ResizeHandleProps = {
  direction: NoteResizeDirection
  disabled: boolean
  positionClassName: string
  onLostPointerCapture(event: ReactPointerEvent<HTMLElement>): void
  onPointerCancel(event: ReactPointerEvent<HTMLElement>): void
  onPointerDown(
    event: ReactPointerEvent<HTMLElement>,
    direction: NoteResizeDirection,
  ): void
  onPointerMove(event: ReactPointerEvent<HTMLElement>): void
  onPointerUp(event: ReactPointerEvent<HTMLElement>): void
}

const resizeCursorClassNames: Record<NoteResizeDirection, string> = {
  east: "cursor-e-resize",
  north: "cursor-n-resize",
  "north-east": "cursor-ne-resize",
  "north-west": "cursor-nw-resize",
  south: "cursor-s-resize",
  "south-east": "cursor-se-resize",
  "south-west": "cursor-sw-resize",
  west: "cursor-w-resize",
}

const resizeHandles: readonly [NoteResizeDirection, string][] = [
  ["north", "-left-1 -right-1 -top-1 h-2"],
  ["south", "-bottom-1 -left-1 -right-1 h-2"],
  ["west", "-bottom-1 -left-1 -top-1 w-2"],
  ["east", "-bottom-1 -right-1 -top-1 w-2"],
  ["north-west", "-left-1.5 -top-1.5 h-3 w-3"],
  ["north-east", "-right-1.5 -top-1.5 h-3 w-3"],
  ["south-west", "-bottom-1.5 -left-1.5 h-3 w-3"],
  ["south-east", "-bottom-1.5 -right-1.5 h-3 w-3"],
]

function ResizeHandle({
  direction,
  disabled,
  onLostPointerCapture,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  positionClassName,
}: ResizeHandleProps) {
  const handleClassName = joinClassNames(
    "absolute z-20 touch-none",
    resizeCursorClassNames[direction],
    positionClassName,
    disabled ? "pointer-events-none" : undefined,
  )

  return (
    <span
      aria-hidden="true"
      className={handleClassName}
      onLostPointerCapture={onLostPointerCapture}
      onPointerCancel={onPointerCancel}
      onPointerDown={(event) => onPointerDown(event, direction)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="presentation"
    />
  )
}

export function NoteResizeHandles() {
  const { controlsDisabled, gesture } = useNoteCardParts()

  return (
    <>
      {resizeHandles.map(([direction, positionClassName]) => (
        <ResizeHandle
          direction={direction}
          disabled={controlsDisabled}
          key={direction}
          onLostPointerCapture={gesture.cancel}
          onPointerCancel={gesture.cancel}
          onPointerDown={gesture.start}
          onPointerMove={gesture.move}
          onPointerUp={gesture.finish}
          positionClassName={positionClassName}
        />
      ))}
    </>
  )
}
