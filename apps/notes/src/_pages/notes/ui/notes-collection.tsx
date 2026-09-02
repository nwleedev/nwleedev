"use client"

import { useEffect, useRef, useState } from "react"

import {
  createNoteReference,
  type Note,
  type NoteGeometry,
} from "@/entities/note"
import { ActionToast } from "@/shared/ui/action-toast"
import { Button } from "@/shared/ui/button"

import type { SaveNoteContentResult } from "../model/save-note-content"
import { useNoteSession } from "../model/note-session-provider"
import { MobileNoteList } from "./mobile-note-list"
import { NotesBoard } from "./notes-board"

type NotesCollectionProps = {
  draftContentByNote: Readonly<Record<string, string>>
  notes: readonly Note[]
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
}

function byTabIndex(left: Note, right: Note) {
  return left.tabIndex - right.tabIndex
}

function geometryDraft(note: Note) {
  return {
    height: String(note.geometry.height),
    width: String(note.geometry.width),
    x: String(note.geometry.x),
    y: String(note.geometry.y),
  }
}

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
    activateProperties: activatePropertiesInSession,
    clearSelection,
    forgetLatestRemoval,
    forgetNote: forgetNoteInSession,
    latestRemovedNote,
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
  const propertiesNoteId = workspace.propertiesNoteId

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

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        clearSelection()
        return
      }

      if (event.key === "Meta") {
        setCommandPressed(true)
        clearSelectionForCommand()
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === "Meta") {
        setCommandPressed(false)
      }
    }

    function resetCommandState() {
      setCommandPressed(false)
    }

    function resetCommandWhenHidden() {
      if (document.visibilityState === "hidden") {
        resetCommandState()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", resetCommandState)
    document.addEventListener("visibilitychange", resetCommandWhenHidden)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", resetCommandState)
      document.removeEventListener("visibilitychange", resetCommandWhenHidden)
    }
  }, [clearSelection])

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
    } catch {
      setNotice({
        kind: "error",
        message: "메모를 만들지 못했습니다. 다시 시도하세요.",
      })
    } finally {
      setCreationPending(false)
    }
  }

  function activateProperties(note: Note) {
    activatePropertiesInSession(
      createNoteReference(note),
      geometryDraft(note),
    )
  }

  function showSaveFailure(message: string) {
    setNotice({ kind: "error", message })
  }

  function saveGeometry(note: Note, geometry: NoteGeometry) {
    return updateNote(note, { geometry })
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
    const removedNote = latestRemovedNote

    if (removedNote === null) {
      return
    }

    try {
      const restoredNote = await restoreNote(removedNote)
      forgetLatestRemoval()
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
      <Button
        className="absolute left-3 top-3 z-30 shadow-floating sm:left-4"
        disabled={creationPending}
        onClick={createNewNote}
        ref={createButton}
      >
        {createLabel}
      </Button>
      {notice ? (
        <div className="absolute right-3 top-16 z-40 w-[min(24rem,calc(100%-1.5rem))]">
          <ActionToast
            kind={notice.kind}
            message={notice.message}
            onDismiss={() => setNotice(null)}
          />
        </div>
      ) : null}
      {latestRemovedNote ? (
        <div className="absolute bottom-4 left-1/2 z-40 w-[min(28rem,calc(100%-1.5rem))] -translate-x-1/2">
          <ActionToast
            actionLabel="취소"
            message="메모를 제거했습니다."
            onAction={restoreLatestRemoval}
            onDismiss={forgetLatestRemoval}
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
      <MobileNoteList notes={orderedNotes} />
      <NotesBoard
        commandPressed={commandPressed}
        draftContentByNote={draftContentByNote}
        focusedNoteId={linkedNoteId}
        key={linkedNoteId ?? "notes-board"}
        notes={orderedNotes}
        onActivateProperties={activateProperties}
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
