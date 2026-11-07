import type { PropsWithChildren } from "react"

import { NotesDataProvider } from "@/_pages/notes/composition"

import { useNoteServices } from "./use-note-services"

type NoteProps = PropsWithChildren<{
  batchCopyShortcutEnabled: boolean
}>

export function Note({
  batchCopyShortcutEnabled,
  children,
}: NoteProps) {
  const { clipboard, createId, now, repository, storageMonitor, readMobileOrder, moveMobileNote } =
    useNoteServices()

  return (
    <NotesDataProvider
      batchCopyShortcutEnabled={batchCopyShortcutEnabled}
      clipboard={clipboard}
      createId={createId}
      now={now}
      readMobileOrder={readMobileOrder}
      moveMobileNote={moveMobileNote}
      repository={repository}
      storageMonitor={storageMonitor}
    >
      {children}
    </NotesDataProvider>
  )
}
