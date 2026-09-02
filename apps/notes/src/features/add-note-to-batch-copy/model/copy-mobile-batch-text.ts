import type { ConfirmingMobileBatchCopyDraft } from "@/entities/batch-copy"
import type {
  ClipboardWriteFailureReason,
  ClipboardWriter,
} from "@/shared/lib/clipboard"

export type CopyMobileBatchTextResult =
  | { status: "copied" }
  | {
      reason: ClipboardWriteFailureReason
      status: "clipboard-failure"
    }

export async function copyMobileBatchText(
  clipboard: ClipboardWriter,
  draft: ConfirmingMobileBatchCopyDraft,
): Promise<CopyMobileBatchTextResult> {
  const text = draft.entries.map(({ textSnapshot }) => textSnapshot).join("\n")
  const result = await clipboard.writeText(text)

  if (result.status === "failed") {
    return {
      reason: result.reason,
      status: "clipboard-failure",
    }
  }

  return { status: "copied" }
}
