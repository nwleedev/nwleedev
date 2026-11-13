import type { ExportResult, RenderExport } from "@/pages/editor"

import { requestWorker } from "../request-worker"
import ExportWorker from "./export-worker?worker&inline"

function decode(value: unknown): ExportResult | undefined {
  if (!value || typeof value !== "object") return undefined
  if (!("clippedMemo" in value) || typeof value.clippedMemo !== "boolean") return undefined
  if ("transparent" in value && value.transparent === true) {
    return { transparent: true, clippedMemo: value.clippedMemo }
  }
  if (!("blob" in value) || !(value.blob instanceof Blob)) return undefined
  const previewBlob = "previewBlob" in value && value.previewBlob instanceof Blob ? value.previewBlob : undefined
  return { blob: value.blob, previewBlob, clippedMemo: value.clippedMemo }
}

export const prepareExport: RenderExport = (request, signal) =>
  requestWorker(() => new ExportWorker(), request, decode, signal)
