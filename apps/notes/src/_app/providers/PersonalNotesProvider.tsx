"use client"

import { useEffect, useState, type PropsWithChildren } from "react"

import { TextAnalysisProvider } from "@/_pages/analysis/composition"
import { NotesDataProvider } from "@/_pages/notes/composition"
import { InteractionPreferencesProvider } from "@/_pages/settings/composition"

import { createLocalApplication } from "../composition/createLocalApplication"

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
      <TextAnalysisProvider analyzer={application.analysis.analyzer}>
        <NotesDataProvider
          repository={application.notes.repository}
          storageMonitor={application.notes.storageMonitor}
        >
          {children}
        </NotesDataProvider>
      </TextAnalysisProvider>
    </InteractionPreferencesProvider>
  )
}
