import type { Note } from "./note"

export type RemovedNoteSnapshot = {
  note: Note
  removedAt: string
}

export type NoteRemovalHistory = {
  entries: readonly RemovedNoteSnapshot[]
}

export const NOTE_REMOVAL_UNDO_DURATION_MS = 5_000

function isSameRemoval(
  left: RemovedNoteSnapshot,
  right: RemovedNoteSnapshot,
) {
  return left.note.id === right.note.id && left.removedAt === right.removedAt
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

export function noteRemovalUndoRemainingMs(
  snapshot: RemovedNoteSnapshot,
  nowMs: number,
) {
  const removedAtMs = Date.parse(snapshot.removedAt)

  if (!Number.isFinite(removedAtMs)) {
    return 0
  }

  const expiresAtMs = removedAtMs + NOTE_REMOVAL_UNDO_DURATION_MS
  return Math.max(0, expiresAtMs - nowMs)
}

export function forgetRemovedNote(
  history: NoteRemovalHistory,
  snapshot: RemovedNoteSnapshot,
): NoteRemovalHistory {
  const entries = history.entries.filter(
    (entry) => !isSameRemoval(entry, snapshot),
  )

  if (entries.length === history.entries.length) {
    return history
  }

  return { entries }
}

export function expireNoteRemoval(
  history: NoteRemovalHistory,
  snapshot: RemovedNoteSnapshot,
  nowMs: number,
): NoteRemovalHistory {
  const latest = history.entries.at(-1)

  if (latest === undefined || !isSameRemoval(latest, snapshot)) {
    return history
  }

  if (noteRemovalUndoRemainingMs(snapshot, nowMs) > 0) {
    return history
  }

  return dismissNoteRemovalHistory(history)
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
