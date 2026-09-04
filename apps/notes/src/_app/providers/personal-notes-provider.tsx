"use client"

import { useEffect, useState, type PropsWithChildren } from "react"

import { TextAnalysisProvider } from "@/_pages/analysis/composition"
import {
  NotesDataProvider,
  NoteSessionProvider,
  useNoteSession,
} from "@/_pages/notes/composition"
import {
  InteractionPreferencesProvider,
  useInteractionPreferences,
} from "@/_pages/settings/composition"
import { UsageReaderProvider } from "@/_pages/usage/composition"
import { TemplateDataProvider } from "@/_pages/templates/composition"
import { MobileBatchCopyProvider } from "@/features/add-note-to-batch-copy"
import { SelectedSourceLinesProvider } from "@/features/suggest-template"

import {
  createLocalApplication,
  type LocalApplication,
} from "../composition/create-local-application"
import { BatchCopyProvider } from "./batch-copy-provider"

type ApplicationProvidersProps = PropsWithChildren<{
  application: LocalApplication
}>

function ApplicationProviders({
  application,
  children,
}: ApplicationProvidersProps) {
  const noteSession = useNoteSession()
  const preferences = useInteractionPreferences()
  const batchCopyShortcutEnabled =
    "preferences" in preferences
      ? preferences.preferences.batchCopyShortcutEnabled
      : false

  return (
    <UsageReaderProvider reader={application.usage.reader}>
      <MobileBatchCopyProvider
        clipboard={application.notes.clipboard}
        createId={application.batchCopy.createId}
        now={application.batchCopy.now}
        repository={application.batchCopy.draftRepository}
        writer={application.batchCopy.mobileWriter}
      >
        <BatchCopyProvider
          clipboard={application.notes.clipboard}
          createId={application.batchCopy.createId}
          now={application.batchCopy.now}
          onItemRemoved={noteSession.forgetBatchCopyItem}
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
  const [application] = useState(createLocalApplication)

  useEffect(() => {
    return () => application.dispose()
  }, [application])

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
          <NoteSessionProvider>
            <ApplicationProviders application={application}>
              {children}
            </ApplicationProviders>
          </NoteSessionProvider>
        </TemplateDataProvider>
      </SelectedSourceLinesProvider>
    </InteractionPreferencesProvider>
  )
}
