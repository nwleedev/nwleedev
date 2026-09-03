import type { Note } from "./note"

export type RemovedNoteSnapshot = {
  note: Note
  removedAt: string
}

export type NoteRemovalHistory = {
  entries: readonly RemovedNoteSnapshot[]
}

export function createNoteRemovalHistory(): NoteRemovalHistory {
  return { entries: [] }
}

export function rememberRemovedNote(
  history: NoteRemovalHistory,
  note: Note,
  removedAt: string,
): NoteRemovalHistory {
  return {
    entries: [...history.entries, { note, removedAt }],
  }
}

export function dismissNoteRemovalHistory(
  history: NoteRemovalHistory,
): NoteRemovalHistory {
  if (history.entries.length === 0) {
    return history
  }

  return createNoteRemovalHistory()
}

export function restoreMostRecentlyRemovedNote(
  history: NoteRemovalHistory,
): { history: NoteRemovalHistory; note: Note } | null {
  const snapshot = history.entries.at(-1)

  if (snapshot === undefined) {
    return null
  }

  return {
    history: { entries: history.entries.slice(0, -1) },
    note: snapshot.note,
  }
}
