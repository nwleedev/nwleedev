import type { PropsWithChildren } from "react"

import { NotesDataProvider } from "@/_pages/notes/composition"
import type { IndividualCopyUsageWriter } from "@/entities/usage"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"
import { useNoteAdapters } from "./use-note-adapters"

type NoteProps = PropsWithChildren<{
  batchCopyShortcutEnabled: boolean
  database: PersonalNotesDatabase
  usage: IndividualCopyUsageWriter
}>

export function Note({
  batchCopyShortcutEnabled,
  children,
  database,
  usage,
}: NoteProps) {
  const { clipboard, createId, drafts, now, repository, storageMonitor } =
    useNoteAdapters(database)

  return (
    <NotesDataProvider
      batchCopyShortcutEnabled={batchCopyShortcutEnabled}
      clipboard={clipboard}
      createId={createId}
      drafts={drafts}
      now={now}
      repository={repository}
      storageMonitor={storageMonitor}
      usage={usage}
    >
      {children}
    </NotesDataProvider>
  )
}
