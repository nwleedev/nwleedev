import type { CopyBatchTextResult } from "@/features/edit-batch-copy"
import { clipboardWriteFailureMessage } from "@/shared/lib/clipboard"

import type { WorkspaceNoticeInput } from "./workspace-notice"

export function useBatchCopyFeedback(
  copyAll: () => Promise<CopyBatchTextResult>,
  showNotice: (notice: WorkspaceNoticeInput) => void,
) {
  function showCopyResult(result: CopyBatchTextResult) {
    if (result.status === "copied") {
      showNotice({ message: "복사했습니다." })
      return
    }

    showNotice({
      actionLabel: "다시 시도",
      kind: "error",
      message: clipboardWriteFailureMessage(result.reason),
      onAction: retryCopyWithoutWaiting,
    })
  }

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

  function retryCopyWithoutWaiting() {
    void retryCopy()
  }

  return showCopyResult
}
