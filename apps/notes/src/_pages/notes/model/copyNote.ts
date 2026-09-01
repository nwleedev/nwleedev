import type { Note } from "@/entities/note"
import type { OrdinaryCopyUsageWriter } from "@/entities/usage"
import type {
  ClipboardWriteFailureReason,
  ClipboardWriter,
} from "@/shared/lib/clipboard"

type CopyNoteDependencies = {
  clipboard: ClipboardWriter
  usage: OrdinaryCopyUsageWriter
}

export type CopyNoteResult =
  | { status: "copied" }
  | {
      reason: ClipboardWriteFailureReason
      status: "clipboard-failure"
    }
  | { status: "usage-failure" }

export async function copyNote(
  dependencies: CopyNoteDependencies,
  note: Note,
): Promise<CopyNoteResult> {
  const clipboard = await dependencies.clipboard.writeText(note.content)

  if (clipboard.status === "failed") {
    return {
      reason: clipboard.reason,
      status: "clipboard-failure",
    }
  }

  try {
    await dependencies.usage.recordOrdinaryCopy({
      note: { contentRevision: note.contentRevision, id: note.id },
      textSnapshot: note.content,
    })
  } catch {
    return { status: "usage-failure" }
  }

  return { status: "copied" }
}
