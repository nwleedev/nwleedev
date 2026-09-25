import type { PropsWithChildren } from "react"

import { MobileBatchCopyProvider } from "@/features/add-note-to-batch-copy"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"
import { useMobileBatchCopyAdapters } from "./use-mobile-batch-copy-adapters"

type MobileBatchCopyProps = PropsWithChildren<{
  database: PersonalNotesDatabase
  reorderButtonsEnabled: boolean
}>

export function MobileBatchCopy({
  children,
  database,
  reorderButtonsEnabled,
}: MobileBatchCopyProps) {
  const { clipboard, createId, now, repository, writer } =
    useMobileBatchCopyAdapters(database)

  return (
    <MobileBatchCopyProvider
      clipboard={clipboard}
      createId={createId}
      now={now}
      reorderButtonsEnabled={reorderButtonsEnabled}
      repository={repository}
      writer={writer}
    >
      {children}
    </MobileBatchCopyProvider>
  )
}
