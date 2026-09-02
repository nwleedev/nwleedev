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
export type NotePropertiesFocus = "first-field" | "preserve"

export type NoteWorkspaceState = {
  activePanel: NoteWorkspacePanel | null
  geometryDraft: NoteGeometryDraft | null
  propertiesFocus: NotePropertiesFocus
  selectedNoteId: string | null
}

export function createNoteWorkspaceState(): NoteWorkspaceState {
  return {
    activePanel: null,
    geometryDraft: null,
    propertiesFocus: "preserve",
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

export function forgetNote(
  state: NoteWorkspaceState,
  noteId: string,
): NoteWorkspaceState {
  const selected = state.selectedNoteId === noteId
  const propertiesTarget = state.geometryDraft?.note.id === noteId

  if (!selected && !propertiesTarget) {
    return state
  }

  const activePanel =
    propertiesTarget && state.activePanel === "note-properties"
      ? null
      : state.activePanel

  return {
    ...state,
    activePanel,
    geometryDraft: propertiesTarget ? null : state.geometryDraft,
    selectedNoteId: selected ? null : state.selectedNoteId,
  }
}

export function activateNoteProperties(
  state: NoteWorkspaceState,
  note: NoteReference,
  fields: NoteGeometryFields,
  focus: NotePropertiesFocus = "preserve",
): NoteWorkspaceState {
  return {
    ...state,
    activePanel: "note-properties",
    geometryDraft: { fields, note },
    propertiesFocus: focus,
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

export function confirmNoteGeometryDraft(
  state: NoteWorkspaceState,
  expected: NoteReference,
  saved: NoteReference,
): NoteWorkspaceState {
  const current = state.geometryDraft
  const expectedDraft =
    current?.note.id === expected.id &&
    current.note.revision === expected.revision

  if (!expectedDraft) {
    return state
  }

  return {
    ...state,
    geometryDraft: { ...current, note: saved },
  }
}

export function closeNoteProperties(
  state: NoteWorkspaceState,
  noteId: string,
): NoteWorkspaceState {
  const currentTarget = state.geometryDraft?.note.id

  if (state.activePanel !== "note-properties" || currentTarget !== noteId) {
    return state
  }

  return { ...state, activePanel: null }
}

export function restoreNoteGeometryDraft(
  state: NoteWorkspaceState,
  note: NoteReference,
  fields: NoteGeometryFields,
): NoteWorkspaceState {
  if (state.geometryDraft?.note.id !== note.id) {
    return state
  }

  return {
    ...state,
    activePanel: null,
    geometryDraft: { fields, note },
    propertiesFocus: "preserve",
  }
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
