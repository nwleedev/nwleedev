import {
  combineBatchCopyText,
  type BatchCopyList,
} from "@/entities/batch-copy"
import type {
  ClipboardWriteFailureReason,
  ClipboardWriter,
} from "@/shared/lib/clipboard"

export type CopyBatchTextResult =
  | { status: "copied" }
  | {
      reason: ClipboardWriteFailureReason
      status: "clipboard-failure"
    }

export async function copyBatchText(
  clipboard: ClipboardWriter,
  list: BatchCopyList,
): Promise<CopyBatchTextResult> {
  const result = await clipboard.writeText(combineBatchCopyText(list))

  if (result.status === "failed") {
    return {
      reason: result.reason,
      status: "clipboard-failure",
    }
  }

  return { status: "copied" }
}
