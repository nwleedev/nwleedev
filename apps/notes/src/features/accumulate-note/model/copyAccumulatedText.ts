import {
  combineAccumulatorText,
  type Accumulator,
} from "@/entities/accumulator"
import type {
  ClipboardWriteFailureReason,
  ClipboardWriter,
} from "@/shared/lib/clipboard"

export type CopyAccumulatedTextResult =
  | { status: "copied" }
  | {
      reason: ClipboardWriteFailureReason
      status: "clipboard-failure"
    }

export async function copyAccumulatedText(
  clipboard: ClipboardWriter,
  accumulator: Accumulator,
): Promise<CopyAccumulatedTextResult> {
  const result = await clipboard.writeText(combineAccumulatorText(accumulator))

  if (result.status === "failed") {
    return {
      reason: result.reason,
      status: "clipboard-failure",
    }
  }

  return { status: "copied" }
}
