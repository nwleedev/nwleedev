"use client"

import { useEffect, useRef, useState } from "react"

import {
  createNoteGeometryDraft,
  createNoteReference,
  noteRemovalUndoRemainingMs,
  type Note,
  type NoteGeometry,
  type NoteGeometryDraftField,
} from "@/entities/note"
import { useAddNoteToBatchCopy } from "@/features/add-note-to-batch-copy"
import type { ClipboardWriteFailureReason } from "@/shared/lib/clipboard"
import { ActionToast } from "@/shared/ui/action-toast"
import { Button } from "@/shared/ui/button"

import type { CopyNoteResult } from "../model/copy-note"
import type { SaveNoteContentResult } from "../model/save-note-content"
import { useNoteSession } from "../model/note-session-provider"
import { useNotePropertiesForm } from "../model/note-properties-form-provider"
import { MobileNotesWorkspace } from "./mobile-notes-workspace"
import { NotesBoard } from "./notes-board"
import { useBatchCopyWorkspace } from "./batch-copy-workspace"

type NotesCollectionProps = {
  batchCopyShortcutEnabled: boolean
  draftContentByNote: Readonly<Record<string, string>>
  notes: readonly Note[]
  copyNote(note: Note): Promise<CopyNoteResult>
  createNote(): Promise<Note>
  moveNoteToBack(noteId: string): Promise<readonly Note[]>
  moveNoteToFront(noteId: string): Promise<readonly Note[]>
  removeNote(note: Note): Promise<Note>
  restoreNote(note: Note): Promise<Note>
  saveContent(noteId: string, content: string): Promise<SaveNoteContentResult>
  updateNote(
    note: Note,
    change: { content?: string; geometry?: NoteGeometry },
  ): Promise<Note>
}

type WorkspaceNotice = {
  kind: "error" | "status"
  message: string
  retry?(): void
}

type WorkspaceNoticeToastProps = {
  notice: WorkspaceNotice
  onDismiss(): void
}

function WorkspaceNoticeToast({
  notice,
  onDismiss,
}: WorkspaceNoticeToastProps) {
  if (notice.retry !== undefined) {
    return (
      <ActionToast
        actionLabel="다시 시도"
        kind={notice.kind}
        message={notice.message}
        onAction={notice.retry}
        onDismiss={onDismiss}
        resetKey={notice}
      />
    )
  }

  return (
    <ActionToast
      kind={notice.kind}
      message={notice.message}
      onDismiss={onDismiss}
      resetKey={notice}
    />
  )
}

function clipboardFailureMessage(reason: ClipboardWriteFailureReason) {
  if (reason === "api-unavailable") {
    return "이 브라우저에서는 클립보드에 복사할 수 없습니다. 텍스트를 직접 선택해 복사하세요."
  }

  if (reason === "not-allowed") {
    return "브라우저가 클립보드 쓰기를 허용하지 않았습니다. 주소 표시줄의 사이트 권한을 확인한 뒤 다시 시도하세요."
  }

  return "클립보드에 쓰는 중 오류가 발생했습니다. 다시 시도하거나 텍스트를 직접 선택해 복사하세요."
}

function byTabIndex(left: Note, right: Note) {
  return left.tabIndex - right.tabIndex
}

const noteGeometryDraftFields: readonly NoteGeometryDraftField[] = [
  "height",
  "width",
  "x",
  "y",
]

function noteIdFromHash() {
  const prefix = "#note-"

  if (!window.location.hash.startsWith(prefix)) {
    return null
  }

  try {
    return decodeURIComponent(window.location.hash.slice(prefix.length))
  } catch {
    return null
  }
}

function focusNote(noteId: string) {
  document.getElementById(`note-${encodeURIComponent(noteId)}-board`)?.focus()
}

export function NotesCollection({
  batchCopyShortcutEnabled,
  copyNote,
  createNote,
  draftContentByNote,
  moveNoteToBack,
  moveNoteToFront,
  notes,
  removeNote,
  restoreNote,
  saveContent,
  updateNote,
}: NotesCollectionProps) {
  const session = useNoteSession()
  const {
    getFieldState: getNotePropertyFieldState,
    getValues: getNotePropertyValues,
    reset: resetNoteProperties,
  } = useNotePropertiesForm()
  const batchCopy = useAddNoteToBatchCopy()
  const batchCopyWorkspace = useBatchCopyWorkspace()
  const {
    activateProperties: activatePropertiesInSession,
    clearSelection,
    clearSelections,
    dismissRemovalNotice,
    expireRemoval,
    forgetNote: forgetNoteInSession,
    forgetRemoval,
    latestRemoval,
    rememberRemoval,
    select,
    workspace,
  } = session
  const createButton = useRef<HTMLButtonElement>(null)
  const orderedNotes = [...notes].sort(byTabIndex)
  const [commandPressed, setCommandPressed] = useState(false)
  const [creationPending, setCreationPending] = useState(false)
  const [linkedNoteId, setLinkedNoteId] = useState<string | null>(null)
  const [notice, setNotice] = useState<WorkspaceNotice | null>(null)
  const createLabel = creationPending ? "메모 만드는 중" : "새 메모"
  const empty = orderedNotes.length === 0
  const selectedNoteId = workspace.selectedNoteId
  const propertiesNoteId = workspace.propertiesTarget?.id ?? null

  useEffect(() => {
    let frame = 0

    function focusLinkedNote() {
      const noteId = noteIdFromHash()
      const noteExists = notes.some(({ id }) => id === noteId)

      if (noteId === null || !noteExists) {
        return
      }

      setLinkedNoteId(noteId)
      select(noteId)
      frame = requestAnimationFrame(() => focusNote(noteId))
    }

    focusLinkedNote()
    window.addEventListener("hashchange", focusLinkedNote)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("hashchange", focusLinkedNote)
    }
  }, [notes, select])

  useEffect(() => {
    const target = workspace.propertiesTarget

    if (target === null) {
      return
    }

    const targetNote = notes.find(({ id }) => id === target.id)
    const draftChanged = noteGeometryDraftFields.some(
      (field) => getNotePropertyFieldState(field).isDirty,
    )
    const savedDraft = targetNote === undefined
      ? null
      : createNoteGeometryDraft(targetNote.geometry)
    const currentDraft = getNotePropertyValues()
    const draftMatchesSaved = savedDraft !== null &&
      noteGeometryDraftFields.every(
        (field) => currentDraft[field] === savedDraft[field],
      )

    if (savedDraft === null || draftChanged || draftMatchesSaved) {
      return
    }

    resetNoteProperties(savedDraft)
  }, [
    getNotePropertyFieldState,
    getNotePropertyValues,
    notes,
    resetNoteProperties,
    workspace.propertiesTarget,
  ])

  useEffect(() => {
    function clearSelectionForCommand() {
      const activeElement = document.activeElement

      if (!(activeElement instanceof HTMLElement)) {
        clearSelection()
        return
      }

      if (!activeElement.hasAttribute("data-note-header-action")) {
        clearSelection()
        return
      }

      activeElement.closest<HTMLElement>("article")?.focus()
      clearSelection()
    }

    function updateCommandState(event: KeyboardEvent | PointerEvent) {
      if (!event.isTrusted) {
        return
      }

      setCommandPressed(event.metaKey)

      if (event.metaKey) {
        clearSelectionForCommand()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!event.isTrusted) {
        return
      }

      updateCommandState(event)

      if (event.defaultPrevented || event.key !== "Escape") {
        return
      }

      if (event.isComposing) {
        return
      }

      if (event.metaKey || event.altKey) {
        return
      }

      if (event.ctrlKey || event.shiftKey) {
        return
      }

      clearSelections()
    }

    function handleKeyUp(event: KeyboardEvent) {
      updateCommandState(event)
    }

    function handlePointerDown(event: PointerEvent) {
      updateCommandState(event)
    }

    function resetCommandState(event: Event) {
      if (!event.isTrusted) {
        return
      }

      setCommandPressed(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("pointerdown", handlePointerDown, true)
    window.addEventListener("blur", resetCommandState)
    window.addEventListener("focus", resetCommandState)
    window.addEventListener("pageshow", resetCommandState)
    document.addEventListener("visibilitychange", resetCommandState)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("pointerdown", handlePointerDown, true)
      window.removeEventListener("blur", resetCommandState)
      window.removeEventListener("focus", resetCommandState)
      window.removeEventListener("pageshow", resetCommandState)
      document.removeEventListener("visibilitychange", resetCommandState)
    }
  }, [clearSelection, clearSelections])

  async function createNewNote() {
    setCreationPending(true)
    setNotice(null)

    try {
      const note = await createNote()
      select(note.id)
      requestAnimationFrame(() => {
        document
          .getElementById(`note-${encodeURIComponent(note.id)}-content`)
          ?.focus()
      })
      return note
    } catch {
      setNotice({
        kind: "error",
        message: "메모를 만들지 못했습니다. 다시 시도하세요.",
      })
      return null
    } finally {
      setCreationPending(false)
    }
  }

  function activateProperties(
    note: Note,
    focus: "first-field" | "preserve",
  ) {
    const target = workspace.propertiesTarget
    const sameTarget = target?.id === note.id
    const draftChanged = noteGeometryDraftFields.some(
      (field) => getNotePropertyFieldState(field).isDirty,
    )
    const targetRevisionChanged =
      sameTarget && target.revision !== note.revision
    const replaceCurrentDraft = targetRevisionChanged && !draftChanged

    if (!sameTarget || replaceCurrentDraft) {
      resetNoteProperties(createNoteGeometryDraft(note.geometry))
    }

    activatePropertiesInSession(
      createNoteReference(note),
      focus,
    )
  }

  function showSaveFailure(message: string) {
    setNotice({ kind: "error", message })
  }

  function showRetryableFailure(message: string, retry?: () => void) {
    if (retry === undefined) {
      showSaveFailure(message)
      return
    }

    setNotice({ kind: "error", message, retry })
  }

  async function copy(note: Note) {
    let result: CopyNoteResult

    try {
      result = await copyNote(note)
    } catch {
      result = { reason: "write-failed", status: "clipboard-failure" }
    }

    if (result.status === "copied") {
      setNotice({ kind: "status", message: "복사했습니다." })
      return
    }

    if (result.status === "usage-failure") {
      setNotice({
        kind: "error",
        message: "텍스트는 복사했지만 사용 횟수를 기록하지 못했습니다.",
      })
      return
    }

    setNotice({
      kind: "error",
      message: clipboardFailureMessage(result.reason),
      retry: () => {
        void copy(note)
      },
    })
  }

  async function addToBatchCopy(note: Note) {
    const result = await batchCopy.add(note)

    if (result.status === "added") {
      setNotice(null)
      batchCopyWorkspace.revealNewBatchCopyItem()
      return
    }

    setNotice({
      kind: "error",
      message: "일괄 복사 항목을 추가하지 못했습니다. 다시 시도하세요.",
      retry: () => {
        void addToBatchCopy(note)
      },
    })
  }

  async function saveGeometry(note: Note, geometry: NoteGeometry) {
    const savedNote = await updateNote(note, { geometry })

    session.confirmPropertiesTarget(
      createNoteReference(note),
      createNoteReference(savedNote),
    )
    return savedNote
  }

  async function remove(note: Note) {
    const removedIndex = orderedNotes.findIndex(({ id }) => id === note.id)
    const nextNote = orderedNotes[removedIndex + 1]
    const previousNote = orderedNotes[removedIndex - 1]
    const focusTarget = nextNote ?? previousNote ?? null

    const removedNote = await removeNote(note)
    rememberRemoval(removedNote, new Date().toISOString())
    forgetNoteInSession(removedNote.id)
    setNotice(null)

    requestAnimationFrame(() => {
      if (focusTarget === null) {
        createButton.current?.focus()
        return
      }

      focusNote(focusTarget.id)
    })
  }

  async function restoreLatestRemoval() {
    const removal = latestRemoval

    if (removal === null) {
      return
    }

    if (noteRemovalUndoRemainingMs(removal, Date.now()) === 0) {
      expireRemoval(removal)
      return
    }

    try {
      const restoredNote = await restoreNote(removal.note)
      forgetRemoval(removal)
      select(restoredNote.id)
      requestAnimationFrame(() => focusNote(restoredNote.id))
    } catch {
      setNotice({
        kind: "error",
        message: "메모를 복원하지 못했습니다. 다시 시도하세요.",
      })
    }
  }

  return (
    <div className="notes-workspace-canvas @container/note-area relative h-full min-h-0 overflow-hidden">
      <div className="absolute left-3 top-3 z-30 hidden @3xl/note-area:block sm:left-4">
        <Button
          className="shadow-floating"
          disabled={creationPending}
          onClick={createNewNote}
          ref={createButton}
          tabIndex={100}
        >
          {createLabel}
        </Button>
      </div>
      {notice ? (
        <div className="absolute right-3 top-16 z-40 w-[min(24rem,calc(100%-1.5rem))]">
          <WorkspaceNoticeToast
            notice={notice}
            onDismiss={() => setNotice(null)}
          />
        </div>
      ) : null}
      {latestRemoval ? (
        <div className="absolute bottom-4 left-1/2 z-40 w-[min(28rem,calc(100%-1.5rem))] -translate-x-1/2">
          <ActionToast
            actionLabel="취소"
            message="메모를 제거했습니다."
            onAction={restoreLatestRemoval}
            onDismiss={dismissRemovalNotice}
            resetKey={latestRemoval}
          />
        </div>
      ) : null}
      {empty ? (
        <p
          className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-sm text-soft-ink"
          role="status"
        >
          메모가 없습니다.
        </p>
      ) : null}
      <MobileNotesWorkspace
        creationPending={creationPending}
        notes={orderedNotes}
        onCopy={copy}
        onCreate={createNewNote}
        onFailure={showRetryableFailure}
      />
      <NotesBoard
        batchCopyShortcutEnabled={batchCopyShortcutEnabled}
        commandPressed={commandPressed}
        draftContentByNote={draftContentByNote}
        focusedNoteId={linkedNoteId}
        key={linkedNoteId ?? "notes-board"}
        notes={orderedNotes}
        onActivateProperties={activateProperties}
        onAddToBatchCopy={addToBatchCopy}
        onCopy={copy}
        onClearSelection={clearSelection}
        onMoveToBack={moveNoteToBack}
        onMoveToFront={moveNoteToFront}
        onRemove={remove}
        onSaveContent={saveContent}
        onSaveFailure={showSaveFailure}
        onSaveGeometry={saveGeometry}
        onSelect={select}
        propertiesNoteId={propertiesNoteId}
        selectedNoteId={selectedNoteId}
      />
    </div>
  )
}
