"use client"

import {
  use,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react"

import type { Note, NoteGeometry } from "@/entities/note"
import { joinClassNames } from "@/shared/lib/join-class-names"
import type { ActionPopoverAction } from "@/shared/ui/action-popover"

import { useNoteCommands, useNotesState } from "../model/notes-data-context"
import { NoteCardContext } from "../model/note-card-context"
import { NoteCardBody } from "./note-card-body"
import { NoteCardHeader } from "./note-card-header"
import { NoteResizeHandles } from "./note-resize-handles"
import { CommandKeyContext } from "../model/use-note-selection-keys"
import { useNoteCardEditor } from "../model/use-note-card-editor"
import {
  useNoteGeometryGesture,
} from "../model/use-note-geometry-gesture"

type NoteCardProps = {
  note: Note
  propertiesTarget: boolean
  scale: number
  selected: boolean
  onActivateProperties(note: Note, focus: "first-field" | "preserve"): void
  onAddToBatchCopy(note: Note): Promise<void>
  onCopy(note: Note): Promise<void>
  onFocusNote(noteId: string): void
  onMoveToBack(noteId: string): Promise<readonly Note[]>
  onMoveToFront(noteId: string): Promise<readonly Note[]>
  onRemove(note: Note): Promise<void>
  onSaveFailure(message: string): void
  onSaveGeometry(note: Note, geometry: NoteGeometry): Promise<Note>
  onSelect(noteId: string): void
  renderOriginX: number
  renderOriginY: number
}

export function NoteCard({
  note,
  onActivateProperties,
  onAddToBatchCopy,
  onCopy,
  onFocusNote,
  onMoveToBack,
  onMoveToFront,
  onRemove,
  onSaveFailure,
  onSaveGeometry,
  onSelect,
  propertiesTarget,
  renderOriginX,
  renderOriginY,
  scale,
  selected,
}: NoteCardProps) {
  const { batchCopyShortcutEnabled } = useNotesState()
  const { saveContent } = useNoteCommands()
  const commandPressed = use(CommandKeyContext)
  const editor = useNoteCardEditor({
    note,
    onSave: saveContent,
  })
  const saveLabel = editor.autosave.pending ? "저장 중" : "저장됨"
  const interactionPending = editor.autosave.status === "saving"
  const gesture = useNoteGeometryGesture({
    disabled: interactionPending,
    note,
    onFailure: onSaveFailure,
    onSave: onSaveGeometry,
    scale,
  })
  const encodedNoteId = encodeURIComponent(note.id)
  const articleId = `note-${encodedNoteId}-board`
  const contentId = `note-${encodedNoteId}-content`
  const selectionDescriptionId = `${articleId}-selection`
  const controlsDisabled = interactionPending || gesture.saving
  const selectedVisible = selected && !commandPressed
  const headerClassName = joinClassNames(
    "relative flex h-9 shrink-0 items-center justify-between",
    commandPressed ? "[&_button]:invisible" : undefined,
  )
  const cardClassName = joinClassNames(
    "absolute flex flex-col overflow-visible rounded-note border border-border bg-surface-raised outline-transparent focus-visible:outline-none after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-note after:content-[''] after:forced-colors:border-[Highlight]",
    selectedVisible
      ? "after:border-2 after:border-selection"
      : undefined,
    propertiesTarget
      ? "outline outline-1 outline-offset-2 outline-dashed outline-border-strong"
      : undefined,
  )
  const cardStyle: CSSProperties = {
    height: gesture.geometry.height,
    left: (gesture.geometry.x - renderOriginX) * scale,
    top: (gesture.geometry.y - renderOriginY) * scale,
    transform: `scale(${scale})`,
    transformOrigin: "0 0",
    width: gesture.geometry.width,
    zIndex: gesture.geometry.zIndex,
  }

  function selectFromHeader(event: ReactMouseEvent<HTMLElement>) {
    if (!gesture.wasClickSuppressed() && !event.metaKey) {
      onSelect(note.id)
    }
  }

  function openPropertiesFromHeader(event: ReactMouseEvent<HTMLElement>) {
    if (!gesture.wasClickSuppressed() && !event.metaKey) {
      onActivateProperties(note, "preserve")
    }
  }

  function selectFromKeyboard(event: ReactFocusEvent<HTMLElement>) {
    onFocusNote(note.id)

    const noteOrContent =
      event.target === event.currentTarget || event.target.id === contentId

    if (noteOrContent && !commandPressed) {
      onSelect(note.id)
    }
  }

  function openPropertiesFromKeyboard(
    event: ReactKeyboardEvent<HTMLElement>,
  ) {
    const batchCopyEnter =
      event.key === "Enter" &&
      event.altKey &&
      event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey
    const validBatchCopyEnter =
      batchCopyEnter && !event.nativeEvent.isComposing && !event.repeat

    if (event.target === event.currentTarget && validBatchCopyEnter) {
      event.preventDefault()
      void onAddToBatchCopy({ ...note, content: editor.readContent() })
      return
    }

    const plainEnter =
      event.key === "Enter" &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey

    if (event.target !== event.currentTarget || !plainEnter || !selected) {
      return
    }

    event.preventDefault()
    onActivateProperties(note, "first-field")
  }

  function prepareContentShortcut(event: ReactMouseEvent<HTMLTextAreaElement>) {
    const individualCopy =
      event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey
    const batchCopy =
      event.metaKey && event.altKey && !event.ctrlKey && !event.shiftKey

    if (individualCopy || (batchCopy && batchCopyShortcutEnabled)) {
      event.preventDefault()
    }
  }

  function runContentShortcut(event: ReactMouseEvent<HTMLTextAreaElement>) {
    const individualCopy =
      event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey
    const batchCopy =
      event.metaKey && event.altKey && !event.ctrlKey && !event.shiftKey

    if (!individualCopy && !batchCopy) {
      if (!event.metaKey) {
        onSelect(note.id)
      }
      return
    }

    if (batchCopy && !batchCopyShortcutEnabled) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    const snapshot = { ...note, content: editor.readContent() }

    if (batchCopy) {
      void onAddToBatchCopy(snapshot)
      return
    }

    void onCopy(snapshot)
  }

  function copyCurrent(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    void onCopy({ ...note, content: editor.readContent() })
  }

  async function moveToFront() {
    try {
      await onMoveToFront(note.id)
    } catch {
      onSaveFailure("메모 순서를 저장하지 못했습니다. 다시 시도하세요.")
    }
  }

  async function moveToBack() {
    try {
      await onMoveToBack(note.id)
    } catch {
      onSaveFailure("메모 순서를 저장하지 못했습니다. 다시 시도하세요.")
    }
  }

  async function remove() {
    const savedNote = await editor.autosave.save()

    if (savedNote === null) {
      return
    }

    try {
      await onRemove(savedNote)
    } catch {
      onSaveFailure("메모를 제거하지 못했습니다. 다시 시도하세요.")
    }
  }

  const actions: readonly ActionPopoverAction[] = [
    {
      icon: "properties",
      id: "properties",
      label: "속성",
      onSelect: () => onActivateProperties(note, "first-field"),
    },
    {
      icon: "front",
      id: "front",
      label: "메모를 맨 앞으로",
      onSelect: () => void moveToFront(),
    },
    {
      icon: "back",
      id: "back",
      label: "메모를 맨 뒤로",
      onSelect: () => void moveToBack(),
    },
    {
      icon: "remove",
      id: "remove",
      label: "메모 삭제",
      onSelect: () => void remove(),
      tone: "danger",
    },
  ]

  return (
    <NoteCardContext value={{
      actions, commandPressed, contentId, controlsDisabled, copyCurrent, editor,
      gesture, headerClassName, openPropertiesFromHeader, prepareContentShortcut,
      runContentShortcut, saveLabel, selectFromHeader,
    }}>
      <article
        aria-describedby={selectedVisible ? selectionDescriptionId : undefined}
        aria-label="메모"
        className={cardClassName}
        id={articleId}
        onFocus={selectFromKeyboard}
        onKeyDown={openPropertiesFromKeyboard}
        style={cardStyle}
        tabIndex={note.tabIndex}
      >
        <span className="sr-only" id={selectionDescriptionId}>
          선택됨
        </span>
        <NoteCardHeader />
        <NoteCardBody />
        <NoteResizeHandles />
      </article>
    </NoteCardContext>
  )
}
