"use client"

import type { PropsWithChildren } from "react"

import {
  NoteSessionProvider,
  useNoteSessionCommands,
} from "@/_pages/notes/composition"
import { useInteractionPreferences } from "@/_pages/settings/composition"
import { UsageReaderProvider } from "@/_pages/usage/composition"
import { SelectedSourceLinesProvider } from "@/features/suggest-template"
import { ActionToastProvider } from "@/shared/ui/action-toast"

import { Analysis } from "../composition/analysis"
import type { PersonalNotesDatabase } from "../composition/indexed-db/personal-notes-database"
import { MobileBatchCopy } from "../composition/mobile-batch-copy"
import { Note } from "../composition/note"
import { Preference } from "../composition/preference"
import { Template } from "../composition/template"
import { useDatabase } from "../composition/use-database"
import { useUsageAdapters } from "../composition/use-usage-adapters"
import { BatchCopyProvider } from "./batch-copy-provider"

type ConnectedProvidersProps = PropsWithChildren<{
  database: PersonalNotesDatabase
}>

function ConnectedProviders({
  children,
  database,
}: ConnectedProvidersProps) {
  const { forgetBatchCopyItem } = useNoteSessionCommands()
  const preferenceState = useInteractionPreferences()
  const usage = useUsageAdapters(database)
  const batchCopyShortcutEnabled =
    "preferences" in preferenceState
      ? preferenceState.preferences.batchCopyShortcutEnabled
      : false
  const batchCopyReorderButtonsEnabled =
    "preferences" in preferenceState
      ? preferenceState.preferences.batchCopyReorderButtonsEnabled
      : false

  return (
    <UsageReaderProvider reader={usage}>
      <MobileBatchCopy
        database={database}
        reorderButtonsEnabled={batchCopyReorderButtonsEnabled}
      >
        <BatchCopyProvider
          database={database}
          onItemRemoved={forgetBatchCopyItem}
          reorderButtonsEnabled={batchCopyReorderButtonsEnabled}
        >
          <Analysis database={database}>
            <Note
              batchCopyShortcutEnabled={batchCopyShortcutEnabled}
              database={database}
              usage={usage}
            >
              {children}
            </Note>
          </Analysis>
        </BatchCopyProvider>
      </MobileBatchCopy>
    </UsageReaderProvider>
  )
}

const now = () => new Date().toISOString()

export function PersonalNotesProvider({ children }: PropsWithChildren) {
  const database = useDatabase()

  return (
    <ActionToastProvider>
      <Preference database={database}>
        <SelectedSourceLinesProvider>
          <Template database={database}>
            <NoteSessionProvider now={now}>
              <ConnectedProviders database={database}>
                {children}
              </ConnectedProviders>
            </NoteSessionProvider>
          </Template>
        </SelectedSourceLinesProvider>
      </Preference>
    </ActionToastProvider>
  )
}
