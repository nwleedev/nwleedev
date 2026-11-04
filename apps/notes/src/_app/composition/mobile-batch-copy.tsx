import type { PropsWithChildren } from "react"

import { MobileBatchCopyProvider } from "@/features/add-note-to-batch-copy"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"
import { useMobileBatchCopyServices } from "./use-mobile-batch-copy-services"

type MobileBatchCopyProps = PropsWithChildren<{
  database: PersonalNotesDatabase
  reorderButtonsEnabled: boolean
}>

export function MobileBatchCopy({
  children,
  database,
  reorderButtonsEnabled,
}: MobileBatchCopyProps) {
  const { clipboard, createId, now, writer } =
    useMobileBatchCopyServices(database)

  return (
    <MobileBatchCopyProvider
      clipboard={clipboard}
      createId={createId}
      now={now}
      reorderButtonsEnabled={reorderButtonsEnabled}
      writer={writer}
    >
      {children}
    </MobileBatchCopyProvider>
  )
}
