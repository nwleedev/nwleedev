import type { Note } from "@/entities/note"

export type NoteContentSaveState = {
  draftCleanupRequired: boolean
  note: Note
  pendingContent: string | null
  status: "failure" | "idle" | "saving"
}

export type NoteContentSaveRequest = {
  content: string
  note: Note
}

export function createNoteContentSaveState(
  note: Note,
  recoveredContent = note.content,
): NoteContentSaveState {
  return {
    draftCleanupRequired: recoveredContent !== note.content,
    note,
    pendingContent: null,
    status: "idle",
  }
}

export function beginNoteContentSave(
  state: NoteContentSaveState,
  content: string,
): {
  request: NoteContentSaveRequest | null
  state: NoteContentSaveState
} {
  const unchanged = content === state.note.content

  if (state.pendingContent !== null) {
    return {
      request: null,
      state,
    }
  }

  if (unchanged && !state.draftCleanupRequired) {
    return {
      request: null,
      state: { ...state, status: "idle" },
    }
  }

  return {
    request: { content, note: state.note },
    state: {
      ...state,
      draftCleanupRequired: true,
      pendingContent: content,
      status: "saving",
    },
  }
}

export function completeNoteContentSave(
  state: NoteContentSaveState,
  note: Note,
): NoteContentSaveState {
  return {
    ...state,
    draftCleanupRequired: false,
    note,
    pendingContent: null,
    status: "idle",
  }
}

export function failNoteContentSave(
  state: NoteContentSaveState,
): NoteContentSaveState {
  return { ...state, pendingContent: null, status: "failure" }
}
