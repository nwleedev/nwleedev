import {
  combineAccumulatorText,
  type Accumulator,
} from "@/entities/accumulator"
import type { ClipboardWriter } from "@/shared/lib/clipboard"

export type CopyAccumulatedTextResult =
  | { status: "copied" }
  | { status: "clipboard-failure" }

export async function copyAccumulatedText(
  clipboard: ClipboardWriter,
  accumulator: Accumulator,
): Promise<CopyAccumulatedTextResult> {
  try {
    await clipboard.writeText(combineAccumulatorText(accumulator))
    return { status: "copied" }
  } catch {
    return { status: "clipboard-failure" }
  }
}
