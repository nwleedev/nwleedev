"use client"

import type {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"

import type { Note, NoteGeometry } from "@/entities/note"
import { joinClassNames } from "@/shared/lib/join-class-names"
import {
  ActionPopover,
  type ActionPopoverAction,
} from "@/shared/ui/action-popover"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { CopyIcon, GripIcon } from "@/shared/ui/icons"
import { StatusNotice } from "@/shared/ui/status-notice"

import type { SaveNoteContentResult } from "../model/save-note-content"
import { useNoteCardEditor } from "../model/use-note-card-editor"
import {
  useNoteGeometryGesture,
  type NoteResizeDirection,
} from "../model/use-note-geometry-gesture"
import { noteContentFailureMessage } from "./note-content-failure-message"

type NoteCardProps = {
  batchCopyShortcutEnabled: boolean
  commandPressed: boolean
  initialContent: string
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
  onSaveContent(
    noteId: string,
    content: string,
  ): Promise<SaveNoteContentResult>
  onSaveFailure(message: string): void
  onSaveGeometry(note: Note, geometry: NoteGeometry): Promise<Note>
  onSelect(noteId: string): void
  renderOriginX: number
  renderOriginY: number
}

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

function stopHeaderAction(event: { stopPropagation(): void }) {
  event.stopPropagation()
}

export function NoteCard({
  batchCopyShortcutEnabled,
  commandPressed,
  initialContent,
  note,
  onActivateProperties,
  onAddToBatchCopy,
  onCopy,
  onFocusNote,
  onMoveToBack,
  onMoveToFront,
  onRemove,
  onSaveContent,
  onSaveFailure,
  onSaveGeometry,
  onSelect,
  propertiesTarget,
  renderOriginX,
  renderOriginY,
  scale,
  selected,
}: NoteCardProps) {
  const editor = useNoteCardEditor({
    initialContent,
    note,
    onSave: onSaveContent,
  })
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
    "flex h-9 shrink-0 items-center justify-between px-1.5",
    commandPressed ? "[&_button]:invisible" : undefined,
  )
  const cardClassName = joinClassNames(
    "absolute flex flex-col overflow-visible rounded-note border border-border bg-surface-raised outline-transparent focus-visible:outline-none after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-note after:content-[''] after:forced-colors:border-[Highlight] focus-visible:after:border-[0.2rem] focus-visible:after:border-dashed focus-visible:after:border-focus has-[textarea:focus-visible]:after:border-[0.2rem] has-[textarea:focus-visible]:after:border-dashed has-[textarea:focus-visible]:after:border-focus",
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

    if (event.target === event.currentTarget && !commandPressed) {
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
    stopHeaderAction(event)
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
      <header className={headerClassName}>
        <IconButton
          aria-label="메모 이동"
          className="h-6 w-6 cursor-grab touch-none active:cursor-grabbing"
          disabled={controlsDisabled}
          onClick={selectFromHeader}
          onDoubleClick={openPropertiesFromHeader}
          onLostPointerCapture={gesture.cancel}
          onPointerCancel={gesture.cancel}
          onPointerDown={(event) => gesture.start(event, "move")}
          onPointerMove={gesture.move}
          onPointerUp={gesture.finish}
          size="compact"
          tabIndex={-1}
        >
          <GripIcon />
        </IconButton>
        <div
          className="flex items-center gap-0.5"
          data-note-header-actions=""
          onClick={stopHeaderAction}
          onDoubleClick={stopHeaderAction}
          onPointerDown={stopHeaderAction}
        >
          <IconButton
            aria-label="메모 복사"
            className="h-6 w-6"
            disabled={controlsDisabled}
            onClick={copyCurrent}
            size="compact"
            tabIndex={commandPressed ? -1 : 0}
          >
            <CopyIcon />
          </IconButton>
          <ActionPopover
            actions={actions}
            disabled={controlsDisabled}
            label="메모 동작"
            triggerClassName="h-6 w-6"
          />
        </div>
      </header>
      <textarea
        aria-label="메모 내용"
        className={joinClassNames(
          "min-h-0 flex-1 resize-none overflow-auto border-0 bg-transparent px-4 py-3 text-base leading-7 text-text outline-transparent focus-visible:outline-none placeholder:text-soft-ink",
        )}
        id={contentId}
        onClick={runContentShortcut}
        onMouseDown={prepareContentShortcut}
        placeholder="메모를 입력하세요"
        {...editor.registration}
      />
      {editor.autosave.failureReason !== null ? (
        <StatusNotice kind="error">
          <p>{noteContentFailureMessage(editor.autosave.failureReason)}</p>
          <Button onClick={() => void editor.autosave.save()} tone="quiet">
            다시 시도
          </Button>
        </StatusNotice>
      ) : null}
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
    </article>
  )
}
