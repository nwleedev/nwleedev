import { clipboardWriteFailureMessage } from "@/shared/lib/clipboard"
import { useActionToast } from "@/shared/ui/action-toast"

import type { CopyBatchTextResult } from "./copy-batch-text"

export function useCopyBatchTextFeedback(
  copyAll: () => Promise<CopyBatchTextResult>,
) {
  const toast = useActionToast()

  async function retryCopy() {
    try {
      showCopyResult(await copyAll())
    } catch {
      showCopyResult({
        reason: "write-failed",
        status: "clipboard-failure",
      })
    }
  }

  function showCopyResult(result: CopyBatchTextResult) {
    if (result.status === "copied") {
      toast.show({ message: "복사했습니다." })
      return
    }

    toast.show({
      actionLabel: "다시 시도",
      kind: "error",
      message: clipboardWriteFailureMessage(result.reason),
      onAction: () => void retryCopy(),
    })
  }

  return showCopyResult
}
