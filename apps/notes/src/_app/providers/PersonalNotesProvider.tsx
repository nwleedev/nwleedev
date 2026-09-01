"use client"

import { useEffect, useState, type PropsWithChildren } from "react"

import { TextAnalysisProvider } from "@/_pages/analysis/composition"
import { NotesDataProvider } from "@/_pages/notes/composition"
import {
  InteractionPreferencesProvider,
  useInteractionPreferences,
} from "@/_pages/settings/composition"
import { UsageReaderProvider } from "@/_pages/usage/composition"
import { TemplateDataProvider } from "@/_pages/templates/composition"
import { SelectedSourceLinesProvider } from "@/features/suggest-template"

import {
  createLocalApplication,
  type LocalApplication,
} from "../composition/createLocalApplication"
import { AccumulatorProvider } from "./AccumulatorProvider"

type ApplicationProvidersProps = PropsWithChildren<{
  application: LocalApplication
}>

function ApplicationProviders({
  application,
  children,
}: ApplicationProvidersProps) {
  const preferences = useInteractionPreferences()
  const metaClickEnabled =
    "preferences" in preferences
      ? preferences.preferences.metaClickEnabled
      : false

  return (
    <UsageReaderProvider reader={application.usage.reader}>
      <AccumulatorProvider
        clipboard={application.notes.clipboard}
        createId={application.accumulator.createId}
        now={application.accumulator.now}
        repository={application.accumulator.repository}
        writer={application.accumulator.writer}
      >
        <TextAnalysisProvider
          analyzer={application.analysis.analyzer}
          now={application.analysis.now}
          reader={application.notes.repository}
        >
          <NotesDataProvider
            clipboard={application.notes.clipboard}
            createId={application.notes.createId}
            metaClickEnabled={metaClickEnabled}
            now={application.notes.now}
            repository={application.notes.repository}
            storageMonitor={application.notes.storageMonitor}
            usage={application.notes.usageWriter}
          >
            {children}
          </NotesDataProvider>
        </TextAnalysisProvider>
      </AccumulatorProvider>
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
          <ApplicationProviders application={application}>
            {children}
          </ApplicationProviders>
        </TemplateDataProvider>
      </SelectedSourceLinesProvider>
    </InteractionPreferencesProvider>
  )
}
