"use client"

import type { PropsWithChildren } from "react"

import { TextAnalysisProvider } from "@/_pages/analysis/composition"
import {
  NotesDataProvider,
  NoteSessionProvider,
  useNoteSessionCommands,
} from "@/_pages/notes/composition"
import {
  InteractionPreferencesProvider,
  useInteractionPreferences,
} from "@/_pages/settings/composition"
import { UsageReaderProvider } from "@/_pages/usage/composition"
import { TemplateDataProvider } from "@/_pages/templates/composition"
import { MobileBatchCopyProvider } from "@/features/add-note-to-batch-copy"
import { SelectedSourceLinesProvider } from "@/features/suggest-template"

import type { LocalApplication } from "../composition/create-local-application"
import { BatchCopyProvider } from "./batch-copy-provider"
import { useLocalApplication } from "./use-local-application"

type ApplicationProvidersProps = PropsWithChildren<{
  application: LocalApplication
}>

function ApplicationProviders({
  application,
  children,
}: ApplicationProvidersProps) {
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
    <UsageReaderProvider reader={application.usage.reader}>
      <MobileBatchCopyProvider
        clipboard={application.notes.clipboard}
        createId={application.batchCopy.createId}
        now={application.batchCopy.now}
        reorderButtonsEnabled={batchCopyReorderButtonsEnabled}
        repository={application.batchCopy.draftRepository}
        writer={application.batchCopy.mobileWriter}
      >
        <BatchCopyProvider
          clipboard={application.notes.clipboard}
          createId={application.batchCopy.createId}
          now={application.batchCopy.now}
          onItemRemoved={forgetBatchCopyItem}
          reorderButtonsEnabled={batchCopyReorderButtonsEnabled}
          repository={application.batchCopy.repository}
          writer={application.batchCopy.writer}
        >
          <TextAnalysisProvider
            analyzer={application.analysis.analyzer}
            now={application.analysis.now}
            reader={application.notes.repository}
          >
            <NotesDataProvider
              clipboard={application.notes.clipboard}
              createId={application.notes.createId}
              drafts={application.notes.draftRepository}
              batchCopyShortcutEnabled={batchCopyShortcutEnabled}
              now={application.notes.now}
              repository={application.notes.repository}
              storageMonitor={application.notes.storageMonitor}
              usage={application.notes.usageWriter}
            >
              {children}
            </NotesDataProvider>
          </TextAnalysisProvider>
        </BatchCopyProvider>
      </MobileBatchCopyProvider>
    </UsageReaderProvider>
  )
}

export function PersonalNotesProvider({ children }: PropsWithChildren) {
  const application = useLocalApplication()

  return (
    <InteractionPreferencesProvider
      now={application.preferences.now}
      repository={application.preferences.repository}
    >
      <SelectedSourceLinesProvider>
        <TemplateDataProvider
          clipboard={application.templates.clipboard}
          createId={application.templates.createId}
          now={application.templates.now}
          repository={application.templates.repository}
        >
          <NoteSessionProvider now={application.notes.now}>
            <ApplicationProviders application={application}>
              {children}
            </ApplicationProviders>
          </NoteSessionProvider>
        </TemplateDataProvider>
      </SelectedSourceLinesProvider>
    </InteractionPreferencesProvider>
  )
}
