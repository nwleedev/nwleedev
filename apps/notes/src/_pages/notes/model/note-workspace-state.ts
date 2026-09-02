import type {
  NoteGeometryDraft as NoteGeometryFields,
  NoteReference,
} from "@/entities/note"

export type NoteGeometryDraft = {
  fields: NoteGeometryFields
  note: NoteReference
}

export type NoteGeometryDraftField = keyof NoteGeometryFields

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
  note: NoteReference,
  fields: NoteGeometryFields,
): NoteWorkspaceState {
  return {
    ...state,
    activePanel: "note-properties",
    geometryDraft: { fields, note },
    propertiesNoteId: note.id,
    selectedNoteId: note.id,
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

export function closeActivePanel(
  state: NoteWorkspaceState,
): NoteWorkspaceState {
  if (state.activePanel === null) {
    return state
  }

  return { ...state, activePanel: null }
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
    geometryDraft: {
      ...state.geometryDraft,
      fields: { ...state.geometryDraft.fields, [field]: value },
    },
  }
}
