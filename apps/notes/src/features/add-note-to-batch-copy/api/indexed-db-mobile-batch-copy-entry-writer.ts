import {
  ACTIVE_MOBILE_BATCH_COPY_DRAFT_KEY,
  MOBILE_BATCH_COPY_DRAFT_STORE_NAME,
  MobileBatchCopyDraftSchema,
  MobileBatchCopyEntrySchema,
  type CollectingMobileBatchCopyDraft,
  type MobileBatchCopyEntry,
} from "@/entities/batch-copy"
import {
  TextUsageRecordSchema,
  USAGE_BY_NOTE_CONTENT_INDEX,
  USAGE_STORE_NAME,
  parseTextUsageRecord,
} from "@/entities/usage"
import type { EntityIdGenerator } from "@/shared/lib/id-generation"
import {
  abortTransaction,
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db"

import type { MobileBatchCopyEntryWriter } from "../model/mobile-batch-copy-entry-writer"

function entryMatchesDraft(
  draft: CollectingMobileBatchCopyDraft,
  entry: MobileBatchCopyEntry,
) {
  const latest = draft.entries.at(-1)

  if (latest === undefined || latest.id !== entry.id) {
    return false
  }

  const sameSource =
    latest.sourceNote.id === entry.sourceNote.id &&
    latest.sourceNote.contentRevision === entry.sourceNote.contentRevision
  return sameSource && latest.textSnapshot === entry.textSnapshot
}

export class IndexedDbMobileBatchCopyEntryWriter
  implements MobileBatchCopyEntryWriter
{
  readonly #connection: IndexedDbConnection
  readonly #identifiers: EntityIdGenerator

  constructor(
    connection: IndexedDbConnection,
    identifiers: EntityIdGenerator,
  ) {
    this.#connection = connection
    this.#identifiers = identifiers
  }

  async saveAndRecordUsage(
    inputDraft: CollectingMobileBatchCopyDraft,
    inputEntry: MobileBatchCopyEntry,
  ) {
    const draft = MobileBatchCopyDraftSchema.parse(inputDraft)
    const entry = MobileBatchCopyEntrySchema.parse(inputEntry)

    if (draft.step !== "collecting") {
      throw new TypeError("Batch copy draft must be collecting")
    }

    const collectingDraft: CollectingMobileBatchCopyDraft = {
      ...draft,
      step: draft.step,
    }

    if (!entryMatchesDraft(collectingDraft, entry)) {
      throw new TypeError("Batch copy entry must be the latest draft item")
    }

    const usageIdentifier = this.#identifiers.create()
    const database = await this.#connection.get()
    const transaction = database.transaction(
      [MOBILE_BATCH_COPY_DRAFT_STORE_NAME, USAGE_STORE_NAME],
      "readwrite",
    )
    const completion = waitForTransaction(transaction)

    try {
      const draftStore = transaction.objectStore(
        MOBILE_BATCH_COPY_DRAFT_STORE_NAME,
      )
      const usageStore = transaction.objectStore(USAGE_STORE_NAME)
      const storedUsage: unknown = await readRequest(
        usageStore
          .index(USAGE_BY_NOTE_CONTENT_INDEX)
          .get([
            entry.sourceNote.id,
            entry.sourceNote.contentRevision,
            entry.textSnapshot,
          ]),
      )
      const currentUsage =
        storedUsage === undefined ? null : parseTextUsageRecord(storedUsage)
      const usage = TextUsageRecordSchema.parse(
        currentUsage === null
          ? {
              counts: { batchCopy: 1, individualCopy: 0 },
              id: usageIdentifier,
              note: entry.sourceNote,
              textSnapshot: entry.textSnapshot,
              updatedAt: collectingDraft.updatedAt,
            }
          : {
              ...currentUsage,
              counts: {
                ...currentUsage.counts,
                batchCopy: currentUsage.counts.batchCopy + 1,
              },
              updatedAt: collectingDraft.updatedAt,
            },
      )

      draftStore.put(collectingDraft, ACTIVE_MOBILE_BATCH_COPY_DRAFT_KEY)
      usageStore.put(usage)
      await completion
      return collectingDraft
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
