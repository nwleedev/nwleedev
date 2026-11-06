import type { Note } from "@/entities/note"
import type {
  ClipboardWriteFailureReason,
  ClipboardWriter,
} from "@/shared/lib/clipboard"

export type CopyNoteResult =
  | { status: "copied" }
  | {
      reason: ClipboardWriteFailureReason
      status: "clipboard-failure"
    }

export async function copyNote(
  clipboard: ClipboardWriter,
  note: Note,
): Promise<CopyNoteResult> {
  const result = await clipboard.writeText(note.content)

  if (result.status === "failed") {
    return {
      reason: result.reason,
      status: "clipboard-failure",
    }
  }

  return { status: "copied" }
}
