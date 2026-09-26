import { useRef, type RefObject } from "react"

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
import { useActionToast } from "@/shared/ui/action-toast"

import { useNotePropertiesForm } from "./note-properties-form-provider"
import { useNoteSession } from "./note-session-provider"
import { useBatchCopyWorkspace } from "./use-batch-copy-workspace"
import { useNoteCopyAction } from "./use-note-copy-action"
import { useNotesData } from "./notes-data-provider"
import { focusNote } from "./use-linked-note"

function byTabIndex(left: Note, right: Note) {
  return left.tabIndex - right.tabIndex
}

export function useNoteCardActions(
  notes: readonly Note[],
  createButton: RefObject<HTMLButtonElement | null>,
) {
  const {
    moveNoteToBack,
    moveNoteToFront,
    removeNote,
    restoreNote,
    saveContent,
    updateNote,
  } = useNotesData()
  const session = useNoteSession()
  const {
    getFieldState: getNotePropertyFieldState,
    reset: resetNoteProperties,
  } = useNotePropertiesForm()
  const batchCopy = useAddNoteToBatchCopy()
  const batchCopyWorkspace = useBatchCopyWorkspace()
  const toast = useActionToast()
  const batchCopyNoticeRevision = useRef<number | null>(null)
  const copy = useNoteCopyAction()
  const orderedNotes = [...notes].sort(byTabIndex)

  function activateProperties(
    note: Note,
    focus: "first-field" | "preserve",
  ) {
    const target = session.workspace.propertiesTarget
    const sameTarget = target?.id === note.id
    const draftChanged = noteGeometryDraftFields.some(
      (field) => getNotePropertyFieldState(field).isDirty,
    )
    const targetRevisionChanged = sameTarget && target.revision !== note.revision
    const replaceCurrentDraft = targetRevisionChanged && !draftChanged

    if (!sameTarget || replaceCurrentDraft) {
      resetNoteProperties(createNoteGeometryDraft(note.geometry))
    }

    session.activateProperties(createNoteReference(note), focus)
  }

  function showSaveFailure(message: string) {
    toast.show({ kind: "error", message })
  }

  async function addToBatchCopy(note: Note) {
    const result = await batchCopy.add(note)

    if (result.status === "added") {
      const revision = batchCopyNoticeRevision.current

      if (revision !== null) {
        toast.dismiss(revision)
        batchCopyNoticeRevision.current = null
      }

      batchCopyWorkspace.revealNewBatchCopyItem()
      return
    }

    batchCopyNoticeRevision.current = toast.show({
      actionLabel: "다시 시도",
      kind: "error",
      message: "일괄 복사 항목을 추가하지 못했습니다. 다시 시도하세요.",
      onAction: () => void addToBatchCopy(note),
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
    const previousRemovals = session.removals
    const removal = session.rememberRemoval(removedNote)

    session.forgetNote(removedNote.id)
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
    let revision = 0
    revision = toast.show({
      actionLabel: "실행 취소",
      expiresAtMs:
        Date.parse(removal.removedAt) + NOTE_REMOVAL_UNDO_DURATION_MS,
      message: "메모를 삭제했습니다.",
      onAction: () => void restoreRemoval(removal, previousRemovals, revision),
      onDismiss: () => session.dismissRemovalNotice(),
      replacement: "preserve",
    })
  }

  async function restoreRemoval(
    removal: RemovedNoteSnapshot,
    previousRemovals: readonly RemovedNoteSnapshot[],
    revision: number,
  ) {
    try {
      const restoredNote = await restoreNote(removal.note)
      session.forgetRemoval(removal)
      session.select(restoredNote.id)
      requestAnimationFrame(() => focusNote(restoredNote.id))

      const previousRemoval = previousRemovals.at(-1)

      if (previousRemoval === undefined) {
        toast.dismiss(revision)
      } else {
        showRemovalNotice(previousRemoval, previousRemovals.slice(0, -1))
      }
    } catch {
      let retryRevision = 0
      retryRevision = toast.show({
        actionLabel: "다시 시도",
        kind: "error",
        message: "메모를 복원하지 못했습니다. 다시 시도하세요.",
        onAction: () =>
          void restoreRemoval(removal, previousRemovals, retryRevision),
        replacement: "preserve",
      })
    }
  }

  return {
    activateProperties,
    addToBatchCopy,
    copy,
    moveToBack: moveNoteToBack,
    moveToFront: moveNoteToFront,
    remove,
    saveContent,
    saveFailure: showSaveFailure,
    saveGeometry,
    select: session.select,
  }
}
