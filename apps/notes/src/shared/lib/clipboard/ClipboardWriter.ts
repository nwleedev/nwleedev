export type ClipboardWriteFailureReason =
  | "api-unavailable"
  | "not-allowed"
  | "write-failed"

export type ClipboardWriteResult =
  | { status: "written" }
  | { reason: ClipboardWriteFailureReason; status: "failed" }

export interface ClipboardWriter {
  writeText(text: string): Promise<ClipboardWriteResult>
}
