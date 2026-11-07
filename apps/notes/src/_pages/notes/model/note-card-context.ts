import { createContext, use, type MouseEvent } from "react"

import type { ActionPopoverAction } from "@/shared/ui/action-popover"

import type { useNoteCardEditor } from "./use-note-card-editor"
import type { useNoteGeometryGesture } from "./use-note-geometry-gesture"

type NoteCardParts = {
  actions: readonly ActionPopoverAction[]
  commandPressed: boolean
  contentId: string
  controlsDisabled: boolean
  copyCurrent(event: MouseEvent<HTMLButtonElement>): void
  editor: ReturnType<typeof useNoteCardEditor>
  gesture: ReturnType<typeof useNoteGeometryGesture>
  headerClassName: string
  openPropertiesFromHeader(event: MouseEvent<HTMLElement>): void
  prepareContentShortcut(event: MouseEvent<HTMLTextAreaElement>): void
  runContentShortcut(event: MouseEvent<HTMLTextAreaElement>): void
  saveLabel: "저장 중" | "저장됨"
  selectFromHeader(event: MouseEvent<HTMLElement>): void
}

export const NoteCardContext = createContext<NoteCardParts | null>(null)

export function useNoteCardParts() {
  const value = use(NoteCardContext)
  if (value === null) throw new Error("메모 카드 안에서만 사용할 수 있습니다.")
  return value
}
