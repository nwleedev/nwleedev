import type { NoteReference } from "@/entities/note"

export type NoteWorkspacePanel = "batch-copy" | "note-properties"
export type NotePropertiesFocus = "first-field" | "preserve"

export type NoteWorkspaceState = {
  activePanel: NoteWorkspacePanel | null
  propertiesFocus: NotePropertiesFocus
  propertiesTarget: NoteReference | null
  selectedBatchCopyItemId: string | null
  selectedNoteId: string | null
}

export function createNoteWorkspaceState(): NoteWorkspaceState {
  return {
    activePanel: null,
    propertiesFocus: "preserve",
    propertiesTarget: null,
    selectedBatchCopyItemId: null,
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

export function toggleBatchCopyItemSelection(
  state: NoteWorkspaceState,
  itemId: string,
): NoteWorkspaceState {
  const selectedBatchCopyItemId =
    state.selectedBatchCopyItemId === itemId ? null : itemId

  return { ...state, selectedBatchCopyItemId }
}

export function clearWorkspaceSelections(
  state: NoteWorkspaceState,
): NoteWorkspaceState {
  const batchCopySelectionEmpty = state.selectedBatchCopyItemId === null
  const noteSelectionEmpty = state.selectedNoteId === null

  if (batchCopySelectionEmpty && noteSelectionEmpty) {
    return state
  }

  return {
    ...state,
    selectedBatchCopyItemId: null,
    selectedNoteId: null,
  }
}

export function forgetBatchCopyItem(
  state: NoteWorkspaceState,
  itemId: string,
): NoteWorkspaceState {
  if (state.selectedBatchCopyItemId !== itemId) {
    return state
  }

  return { ...state, selectedBatchCopyItemId: null }
}

export function forgetNote(
  state: NoteWorkspaceState,
  noteId: string,
): NoteWorkspaceState {
  const selected = state.selectedNoteId === noteId
  const propertiesTarget = state.propertiesTarget?.id === noteId

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
    propertiesTarget: propertiesTarget ? null : state.propertiesTarget,
    selectedNoteId: selected ? null : state.selectedNoteId,
  }
}

export function activateNoteProperties(
  state: NoteWorkspaceState,
  note: NoteReference,
  focus: NotePropertiesFocus = "preserve",
): NoteWorkspaceState {
  return {
    ...state,
    activePanel: "note-properties",
    propertiesFocus: focus,
    propertiesTarget: note,
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

export function confirmNotePropertiesTarget(
  state: NoteWorkspaceState,
  expected: NoteReference,
  saved: NoteReference,
): NoteWorkspaceState {
  const current = state.propertiesTarget
  const expectedTarget =
    current?.id === expected.id &&
    current.revision === expected.revision

  if (!expectedTarget) {
    return state
  }

  return {
    ...state,
    propertiesTarget: saved,
  }
}

export function closeNoteProperties(
  state: NoteWorkspaceState,
  noteId: string,
): NoteWorkspaceState {
  const currentTarget = state.propertiesTarget?.id

  if (state.activePanel !== "note-properties" || currentTarget !== noteId) {
    return state
  }

  return { ...state, activePanel: null }
}

export function restoreNotePropertiesTarget(
  state: NoteWorkspaceState,
  note: NoteReference,
): NoteWorkspaceState {
  if (state.propertiesTarget?.id !== note.id) {
    return state
  }

  return {
    ...state,
    activePanel: null,
    propertiesFocus: "preserve",
    propertiesTarget: note,
  }
}
