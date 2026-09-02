export type NoteGeometryDraft = {
  height: string
  width: string
  x: string
  y: string
}

export type NoteGeometryDraftField = keyof NoteGeometryDraft

export type NoteWorkspacePanel = "batch-copy" | "note-properties"

export type NoteWorkspaceState = {
  activePanel: NoteWorkspacePanel | null
  geometryDraft: NoteGeometryDraft | null
  propertiesNoteId: string | null
  selectedNoteId: string | null
}

export function createNoteWorkspaceState(): NoteWorkspaceState {
  return {
    activePanel: null,
    geometryDraft: null,
    propertiesNoteId: null,
    selectedNoteId: null,
  }
}

export function selectNote(
  state: NoteWorkspaceState,
  noteId: string,
): NoteWorkspaceState {
  return { ...state, selectedNoteId: noteId }
}

export function clearNoteSelection(
  state: NoteWorkspaceState,
): NoteWorkspaceState {
  if (state.selectedNoteId === null) {
    return state
  }

  return { ...state, selectedNoteId: null }
}

export function activateNoteProperties(
  state: NoteWorkspaceState,
  noteId: string,
  geometryDraft: NoteGeometryDraft,
): NoteWorkspaceState {
  return {
    ...state,
    activePanel: "note-properties",
    geometryDraft,
    propertiesNoteId: noteId,
    selectedNoteId: noteId,
  }
}

export function activateBatchCopyPanel(
  state: NoteWorkspaceState,
): NoteWorkspaceState {
  if (state.activePanel === "batch-copy") {
    return state
  }

  return { ...state, activePanel: "batch-copy" }
}

export function updateNoteGeometryDraft(
  state: NoteWorkspaceState,
  field: NoteGeometryDraftField,
  value: string,
): NoteWorkspaceState {
  if (state.geometryDraft === null) {
    return state
  }

  return {
    ...state,
    geometryDraft: { ...state.geometryDraft, [field]: value },
  }
}
