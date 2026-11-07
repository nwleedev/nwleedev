"use client"

import type { PropsWithChildren } from "react"

import {
  NoteSessionProvider,
  useNoteSessionCommands,
} from "@/_pages/notes/composition"
import { useInteractionPreferences } from "@/_pages/settings/composition"
import { SelectedSourceLinesProvider } from "@/features/suggest-template"
import { ActionToastProvider } from "@/shared/ui/action-toast"

import { Analysis } from "../composition/analysis"
import { MobileBatchCopy } from "../composition/mobile-batch-copy"
import { Note } from "../composition/note"
import { Preference } from "../composition/preference"
import { Template } from "../composition/template"
import { DatabaseProvider } from "./database-provider"
import { BatchCopyProvider } from "./batch-copy-provider"

function ConnectedProviders({ children }: PropsWithChildren) {
  const { forgetBatchCopyItem } = useNoteSessionCommands()
  const preferenceState = useInteractionPreferences()
  const batchCopyShortcutEnabled =
    "preferences" in preferenceState
      ? preferenceState.preferences.batchCopyShortcutEnabled
      : false
  const batchCopyReorderButtonsEnabled =
    "preferences" in preferenceState
      ? preferenceState.preferences.batchCopyReorderButtonsEnabled
      : false

  return (
    <MobileBatchCopy
      reorderButtonsEnabled={batchCopyReorderButtonsEnabled}
    >
      <BatchCopyProvider
        onItemRemoved={forgetBatchCopyItem}
        reorderButtonsEnabled={batchCopyReorderButtonsEnabled}
      >
        <Analysis>
          <Note batchCopyShortcutEnabled={batchCopyShortcutEnabled}>
            {children}
          </Note>
        </Analysis>
      </BatchCopyProvider>
    </MobileBatchCopy>
  )
}

export function PersonalNotesProvider({ children }: PropsWithChildren) {
  return (
    <DatabaseProvider>
      <ActionToastProvider>
        <Preference>
          <SelectedSourceLinesProvider>
            <Template>
              <NoteSessionProvider now={Date.now}>
                <ConnectedProviders>{children}</ConnectedProviders>
              </NoteSessionProvider>
            </Template>
          </SelectedSourceLinesProvider>
        </Preference>
      </ActionToastProvider>
    </DatabaseProvider>
  )
}
