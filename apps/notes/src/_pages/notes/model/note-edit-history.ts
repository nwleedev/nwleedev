import { changedNoteText, openNoteBody, type Note } from "@/entities/note"

export type EditSelection = {
  start: number
  end: number
  direction: "forward" | "backward" | "none"
}

type Edit = {
  start: number
  removed: string
  inserted: string
  beforeSelection: EditSelection
  afterSelection: EditSelection
  inputType: string
  time: number
}

export type NoteEditHistory = {
  past: readonly Edit[]
  future: readonly Edit[]
  grouping: boolean
}

type ContentEdit = {
  before: string
  after: string
  beforeSelection: EditSelection
  afterSelection: EditSelection
  inputType: string
  time: number
}

const GROUP_DELAY_MS = 750
const MAX_GROUPS = 200
const MAX_TEXT_UNITS = 1_048_576

export function createNoteEditHistory(): NoteEditHistory {
  return { past: [], future: [], grouping: false }
}

function mergeEdit(previous: Edit, next: Edit): Edit | null {
  if (previous.inputType !== next.inputType) return null
  if (next.time - previous.time > GROUP_DELAY_MS) return null
  if (previous.afterSelection.start !== next.beforeSelection.start) return null
  if (previous.afterSelection.end !== next.beforeSelection.end) return null
  if (next.beforeSelection.start !== next.beforeSelection.end) return null
  const merged = { ...previous, afterSelection: next.afterSelection, time: next.time }
  if (next.inputType === "insertText" && !previous.removed && !next.removed) {
    if (next.start === previous.start + previous.inserted.length) {
      return { ...merged, inserted: previous.inserted + next.inserted }
    }
  }
  if (previous.inserted || next.inserted) return null
  if (next.inputType === "deleteContentBackward") {
    if (next.start + next.removed.length === previous.start) {
      return { ...merged, start: next.start, removed: next.removed + previous.removed }
    }
  }
  if (next.inputType === "deleteContentForward" && next.start === previous.start) {
    return { ...merged, removed: previous.removed + next.removed }
  }
  return null
}

export function recordNoteEdit(history: NoteEditHistory, change: ContentEdit): NoteEditHistory {
  const { before, after, ...metadata } = change
  if (before === after) return history
  const edit = { ...metadata, ...changedNoteText(before, after) }
  const past = [...history.past]
  const previous = past.at(-1)
  const merged = history.grouping && previous ? mergeEdit(previous, edit) : null
  if (merged) past[past.length - 1] = merged
  else past.push(edit)
  let units = 0
  let first = past.length - 1
  for (let index = past.length - 1; index >= 0; index -= 1) {
    const entry = past[index]
    units += entry.removed.length + entry.inserted.length
    if (index < past.length - 1 && (units > MAX_TEXT_UNITS || past.length - index > MAX_GROUPS)) break
    first = index
  }
  return { past: past.slice(first), future: [], grouping: true }
}

export function rebaseNoteEditHistory(history: NoteEditHistory, previous: Note, saved: Note): NoteEditHistory {
  function rebase(entries: readonly Edit[], undo: boolean) {
    if (entries.length === 0) return entries
    const original = openNoteBody(previous)
    const merged = openNoteBody(saved)
    if (!original || !merged) return entries
    const result: Edit[] = []
    const moveSelection = (selection: EditSelection) => ({
      ...selection, ...original.selectionIn(merged, selection.start, selection.end),
    })
    for (const edit of [...entries].reverse()) {
      const removed = undo ? edit.inserted : edit.removed
      const inserted = undo ? edit.removed : edit.inserted
      const current = merged.text
      const from = moveSelection(undo ? edit.afterSelection : edit.beforeSelection)
      merged.receive(original.replace(edit.start, edit.start + removed.length, inserted))
      const next = merged.text
      if (current === next) continue
      const to = moveSelection(undo ? edit.beforeSelection : edit.afterSelection)
      const change = undo ? changedNoteText(next, current) : changedNoteText(current, next)
      result.push({ ...edit, ...change, beforeSelection: undo ? to : from, afterSelection: undo ? from : to })
    }
    return result.reverse()
  }
  return { past: rebase(history.past, true), future: rebase(history.future, false), grouping: false }
}

export function replayNoteEdit(history: NoteEditHistory, content: string, direction: "undo" | "redo") {
  const undo = direction === "undo"
  const source = undo ? history.past : history.future
  const edit = source.at(-1)
  if (!edit) return null
  const removed = undo ? edit.inserted : edit.removed
  const inserted = undo ? edit.removed : edit.inserted
  return {
    content: content.slice(0, edit.start) + inserted + content.slice(edit.start + removed.length),
    selection: undo ? edit.beforeSelection : edit.afterSelection,
    history: {
      past: undo ? history.past.slice(0, -1) : [...history.past, edit],
      future: undo ? [...history.future, edit] : history.future.slice(0, -1),
      grouping: false,
    },
  }
}
