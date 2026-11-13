import type { ProjectDocument } from "@/entities/project"

import { requestWorker } from "../request-worker"
import ArchiveWorker from "./archive-worker?worker&inline"

export function prepareArchive(document: ProjectDocument) {
  return requestWorker(() => new ArchiveWorker(), document, (value) =>
    value instanceof Blob ? value : undefined,
  )
}
