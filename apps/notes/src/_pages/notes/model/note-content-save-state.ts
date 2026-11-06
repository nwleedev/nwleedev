import type { Note } from "@/entities/note"

export type NoteContentSaveState = {
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
): NoteContentSaveState {
  return {
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

  if (unchanged) {
    return {
      request: null,
      state: { ...state, status: "idle" },
    }
  }

  return {
    request: { content, note: state.note },
    state: {
      ...state,
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
