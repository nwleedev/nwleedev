import {
  createNoteGeometryDraft,
  createNoteReference,
  noteGeometryDraftFields,
  NOTE_REMOVAL_UNDO_DURATION_MS,
  type Note,
  type NoteGeometry,
  type RemovedNoteSnapshot,
} from "@/entities/note"
import { useAddNoteToBatchCopy } from "@/features/add-note-to-batch-copy"
import { clipboardWriteFailureMessage } from "@/shared/lib/clipboard"
import { Button } from "@/shared/ui/button"

import type { CopyNoteResult } from "../model/copy-note"
import type { SaveNoteContentResult } from "../model/save-note-content"
import { useNoteSession } from "../model/note-session-provider"
import { useNotePropertiesForm } from "../model/note-properties-form-provider"
import { useNotePropertiesSync } from "../model/use-note-properties-sync"
import {
  focusNote,
  useNotesCollectionInteractions,
} from "../model/use-notes-collection-interactions"
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

function byTabIndex(left: Note, right: Note) {
  return left.tabIndex - right.tabIndex
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
    forgetNote: forgetNoteInSession,
    forgetRemoval,
    rememberRemoval,
    select,
    workspace,
  } = session
  const orderedNotes = [...notes].sort(byTabIndex)
  const {
    commandPressed,
    createButton,
    createNewNote,
    creationPending,
    linkedNoteId,
  } = useNotesCollectionInteractions({
    clearSelection,
    clearSelections,
    createNote,
    notes,
    select,
    showNotice: batchCopyWorkspace.showNotice,
  })
  const createLabel = creationPending ? "메모 만드는 중" : "새 메모"
  const empty = orderedNotes.length === 0
  const selectedNoteId = workspace.selectedNoteId
  const propertiesNoteId = workspace.propertiesTarget?.id ?? null

  useNotePropertiesSync({
    getFieldState: getNotePropertyFieldState,
    getValues: getNotePropertyValues,
    notes,
    reset: resetNoteProperties,
    target: workspace.propertiesTarget,
  })

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
    batchCopyWorkspace.showNotice({ kind: "error", message })
  }

  function showRetryableFailure(message: string, retry?: () => void) {
    if (retry === undefined) {
      showSaveFailure(message)
      return
    }

    batchCopyWorkspace.showNotice({
      actionLabel: "다시 시도",
      kind: "error",
      message,
      onAction: retry,
    })
  }

  async function copy(note: Note) {
    let result: CopyNoteResult

    try {
      result = await copyNote(note)
    } catch {
      result = { reason: "write-failed", status: "clipboard-failure" }
    }

    if (result.status === "copied") {
      batchCopyWorkspace.showNotice({ message: "복사했습니다." })
      return
    }

    if (result.status === "usage-failure") {
      batchCopyWorkspace.showNotice({
        kind: "error",
        message: "텍스트는 복사했지만 사용 횟수를 기록하지 못했습니다.",
      })
      return
    }

    batchCopyWorkspace.showNotice({
      actionLabel: "다시 시도",
      kind: "error",
      message: clipboardWriteFailureMessage(result.reason),
      onAction: () => {
        void copy(note)
      },
    })
  }

  async function addToBatchCopy(note: Note) {
    const result = await batchCopy.add(note)

    if (result.status === "added") {
      batchCopyWorkspace.dismissNotice()
      batchCopyWorkspace.revealNewBatchCopyItem()
      return
    }

    batchCopyWorkspace.showNotice({
      actionLabel: "다시 시도",
      kind: "error",
      message: "일괄 복사 항목을 추가하지 못했습니다. 다시 시도하세요.",
      onAction: () => {
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
    const removedAt = new Date().toISOString()
    const removal = { note: removedNote, removedAt }
    const previousRemovals = session.removals

    rememberRemoval(removedNote, removedAt)
    forgetNoteInSession(removedNote.id)
    showRemovalNotice(removal, previousRemovals)

    requestAnimationFrame(() => {
      if (focusTarget === null) {
        createButton.current?.focus()
        return
      }

      focusNote(focusTarget.id)
    })
  }

  function showRemovalNotice(
    removal: RemovedNoteSnapshot,
    previousRemovals: readonly RemovedNoteSnapshot[],
  ) {
    batchCopyWorkspace.showNotice({
      actionLabel: "실행 취소",
      expiresAtMs:
        Date.parse(removal.removedAt) + NOTE_REMOVAL_UNDO_DURATION_MS,
      message: "메모를 삭제했습니다.",
      onAction: () => {
        void restoreRemoval(removal, previousRemovals)
      },
      onDismiss: dismissRemovalNotice,
      replacement: "preserve",
    })
  }

  async function restoreRemoval(
    removal: RemovedNoteSnapshot,
    previousRemovals: readonly RemovedNoteSnapshot[],
  ) {
    try {
      const restoredNote = await restoreNote(removal.note)
      forgetRemoval(removal)
      select(restoredNote.id)
      requestAnimationFrame(() => focusNote(restoredNote.id))

      const previousRemoval = previousRemovals.at(-1)

      if (previousRemoval === undefined) {
        batchCopyWorkspace.dismissNotice()
      } else {
        showRemovalNotice(previousRemoval, previousRemovals.slice(0, -1))
      }
    } catch {
      batchCopyWorkspace.showNotice({
        kind: "error",
        message: "메모를 복원하지 못했습니다. 다시 시도하세요.",
      })
    }
  }

  return (
    <div className="@container/note-area relative h-full min-h-0 overflow-clip bg-canvas">
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
