import type { SaveNoteContentFailureReason } from "./save-note-content"

export type NoteDetailFailure =
  | { kind: "draft" }
  | { kind: "save"; reason: SaveNoteContentFailureReason }
