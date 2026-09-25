import type { SaveNoteContentFailureReason } from "./save-note-content"

export type NoteDetailFailure =
  | { kind: "discard" }
  | { kind: "draft" }
  | { kind: "save"; reason: SaveNoteContentFailureReason }
