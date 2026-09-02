import {
  addMobileBatchCopyEntry,
  beginMobileBatchCopy,
  confirmMobileBatchCopy,
  duplicateMobileBatchCopyEntry,
  moveMobileBatchCopyEntry,
  removeMobileBatchCopyEntry,
  resumeMobileBatchCopyCollection,
  resetMobileBatchCopy,
  type CollectingMobileBatchCopyDraft,
  type ConfirmingMobileBatchCopyDraft,
  type MobileBatchCopyDraft,
  type MobileBatchCopyDraftRepository,
  type MobileBatchCopyEntry,
} from "@/entities/batch-copy"
import type { Note } from "@/entities/note"

import type { MobileBatchCopyEntryWriter } from "./mobile-batch-copy-entry-writer"

type MobileBatchCopyClock = {
  now(): string
}

type MobileBatchCopyIdentifiers = {
  createId(): string
}

type MobileBatchCopyPersistence = MobileBatchCopyClock & {
  repository: MobileBatchCopyDraftRepository
}

type AddNoteToMobileBatchCopyDependencies = MobileBatchCopyClock &
  MobileBatchCopyIdentifiers & {
    writer: MobileBatchCopyEntryWriter
  }

type StartMobileBatchCopyDependencies = MobileBatchCopyIdentifiers &
  MobileBatchCopyPersistence

type EditMobileBatchCopyDependencies = MobileBatchCopyIdentifiers &
  MobileBatchCopyPersistence

export type MobileBatchCopyLoadResult =
  | { draft: MobileBatchCopyDraft | null; status: "loaded" }
  | { status: "failure" }

export type MobileBatchCopySaveResult<
  Draft extends MobileBatchCopyDraft = MobileBatchCopyDraft,
> =
  | { draft: Draft; status: "saved" }
  | { status: "failure" }

export type MobileBatchCopyRemoveResult =
  | { status: "removed" }
  | { status: "failure" }

export async function loadMobileBatchCopy(
  repository: MobileBatchCopyDraftRepository,
): Promise<MobileBatchCopyLoadResult> {
  try {
    return { draft: await repository.get(), status: "loaded" }
  } catch {
    return { status: "failure" }
  }
}

export async function startMobileBatchCopy(
  dependencies: StartMobileBatchCopyDependencies,
): Promise<MobileBatchCopySaveResult<CollectingMobileBatchCopyDraft>> {
  const startedAt = dependencies.now()
  const draft = beginMobileBatchCopy({
    id: dependencies.createId(),
    startedAt,
  })

  try {
    await dependencies.repository.save(draft)
    return { draft, status: "saved" }
  } catch {
    return { status: "failure" }
  }
}

export async function addNoteToMobileBatchCopy(
  dependencies: AddNoteToMobileBatchCopyDependencies,
  draft: CollectingMobileBatchCopyDraft,
  note: Note,
): Promise<MobileBatchCopySaveResult<CollectingMobileBatchCopyDraft>> {
  const updatedAt = dependencies.now()
  const entry: MobileBatchCopyEntry = {
    id: dependencies.createId(),
    sourceNote: {
      contentRevision: note.contentRevision,
      id: note.id,
    },
    textSnapshot: note.content,
  }
  const nextDraft = addMobileBatchCopyEntry(draft, entry, updatedAt)

  try {
    return {
      draft: await dependencies.writer.saveAndRecordUsage(nextDraft, entry),
      status: "saved",
    }
  } catch {
    return { status: "failure" }
  }
}

export async function resetMobileBatchCopySession(
  dependencies: MobileBatchCopyPersistence,
  draft: CollectingMobileBatchCopyDraft,
): Promise<MobileBatchCopySaveResult<CollectingMobileBatchCopyDraft>> {
  const nextDraft = resetMobileBatchCopy(draft, dependencies.now())

  try {
    await dependencies.repository.save(nextDraft)
    return { draft: nextDraft, status: "saved" }
  } catch {
    return { status: "failure" }
  }
}

export async function confirmMobileBatchCopySession(
  dependencies: MobileBatchCopyPersistence,
  draft: CollectingMobileBatchCopyDraft,
): Promise<MobileBatchCopySaveResult<ConfirmingMobileBatchCopyDraft>> {
  const nextDraft = confirmMobileBatchCopy(draft, dependencies.now())

  try {
    await dependencies.repository.save(nextDraft)
    return { draft: nextDraft, status: "saved" }
  } catch {
    return { status: "failure" }
  }
}

export async function cancelMobileBatchCopy(
  repository: MobileBatchCopyDraftRepository,
): Promise<MobileBatchCopyRemoveResult> {
  try {
    await repository.remove()
    return { status: "removed" }
  } catch {
    return { status: "failure" }
  }
}

async function saveConfirmingDraft(
  repository: MobileBatchCopyDraftRepository,
  draft: ConfirmingMobileBatchCopyDraft,
): Promise<MobileBatchCopySaveResult<ConfirmingMobileBatchCopyDraft>> {
  try {
    await repository.save(draft)
    return { draft, status: "saved" }
  } catch {
    return { status: "failure" }
  }
}

export function moveMobileBatchCopySessionEntry(
  dependencies: MobileBatchCopyPersistence,
  draft: ConfirmingMobileBatchCopyDraft,
  entryId: string,
  index: number,
) {
  const nextDraft = moveMobileBatchCopyEntry(
    draft,
    entryId,
    index,
    dependencies.now(),
  )
  return saveConfirmingDraft(dependencies.repository, nextDraft)
}

export function duplicateMobileBatchCopySessionEntry(
  dependencies: EditMobileBatchCopyDependencies,
  draft: ConfirmingMobileBatchCopyDraft,
  entryId: string,
) {
  const nextDraft = duplicateMobileBatchCopyEntry(
    draft,
    entryId,
    dependencies.createId(),
    dependencies.now(),
  )
  return saveConfirmingDraft(dependencies.repository, nextDraft)
}

export function removeMobileBatchCopySessionEntry(
  dependencies: MobileBatchCopyPersistence,
  draft: ConfirmingMobileBatchCopyDraft,
  entryId: string,
) {
  const nextDraft = removeMobileBatchCopyEntry(
    draft,
    entryId,
    dependencies.now(),
  )
  return saveConfirmingDraft(dependencies.repository, nextDraft)
}

export async function resumeMobileBatchCopySession(
  dependencies: MobileBatchCopyPersistence,
  draft: ConfirmingMobileBatchCopyDraft,
): Promise<MobileBatchCopySaveResult<CollectingMobileBatchCopyDraft>> {
  const nextDraft = resumeMobileBatchCopyCollection(
    draft,
    dependencies.now(),
  )

  try {
    await dependencies.repository.save(nextDraft)
    return { draft: nextDraft, status: "saved" }
  } catch {
    return { status: "failure" }
  }
}
