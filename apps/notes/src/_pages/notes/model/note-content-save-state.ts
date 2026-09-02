import type { Note } from "@/entities/note"

export type NoteContentSaveState = {
  draftContent: string
  note: Note
  pendingContent: string | null
  status: "clean" | "dirty" | "failure" | "saving"
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
    draftContent: recoveredContent,
    note,
    pendingContent: null,
    status: recoveredContent === note.content ? "clean" : "dirty",
  }
}

export function updateNoteContentDraft(
  state: NoteContentSaveState,
  content: string,
): NoteContentSaveState {
  if (content === state.draftContent) {
    return state
  }

  let status: NoteContentSaveState["status"] = "dirty"

  if (state.pendingContent !== null) {
    status = "saving"
  } else if (content === state.note.content) {
    status = "clean"
  }

  return { ...state, draftContent: content, status }
}

export function beginNoteContentSave(state: NoteContentSaveState): {
  request: NoteContentSaveRequest | null
  state: NoteContentSaveState
} {
  const unchanged = state.draftContent === state.note.content

  if (state.pendingContent !== null || unchanged) {
    return {
      request: null,
      state: unchanged ? { ...state, status: "clean" } : state,
    }
  }

  return {
    request: { content: state.draftContent, note: state.note },
    state: {
      ...state,
      pendingContent: state.draftContent,
      status: "saving",
    },
  }
}

export function completeNoteContentSave(
  state: NoteContentSaveState,
  note: Note,
): NoteContentSaveState {
  const status = state.draftContent === note.content ? "clean" : "dirty"

  return { ...state, note, pendingContent: null, status }
}

export function failNoteContentSave(
  state: NoteContentSaveState,
): NoteContentSaveState {
  return { ...state, pendingContent: null, status: "failure" }
}
