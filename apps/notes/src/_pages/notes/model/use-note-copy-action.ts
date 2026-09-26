import type { Note } from "@/entities/note"
import { clipboardWriteFailureMessage } from "@/shared/lib/clipboard"
import { useActionToast } from "@/shared/ui/action-toast"

import type { CopyNoteResult } from "./copy-note"
import { useNotesData } from "./notes-data-provider"

export function useNoteCopyAction() {
  const { copyNote } = useNotesData()
  const toast = useActionToast()

  async function copy(note: Note) {
    let result: CopyNoteResult

    try {
      result = await copyNote(note)
    } catch {
      result = { reason: "write-failed", status: "clipboard-failure" } as const
    }

    if (result.status === "copied") {
      toast.show({ message: "복사했습니다." })
      return
    }

    if (result.status === "usage-failure") {
      toast.show({
        kind: "error",
        message: "텍스트는 복사했지만 사용 횟수를 기록하지 못했습니다.",
      })
      return
    }

    toast.show({
      actionLabel: "다시 시도",
      kind: "error",
      message: clipboardWriteFailureMessage(result.reason),
      onAction: () => void copy(note),
    })
  }

  return copy
}
