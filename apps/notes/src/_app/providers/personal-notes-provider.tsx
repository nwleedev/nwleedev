"use client"

import type { PropsWithChildren } from "react"

import { TextAnalysisProvider } from "@/_pages/analysis/composition.browser"
import { NoteSessionProvider, NotesDataProvider } from "@/_pages/notes/composition.browser"
import { TemplateDataProvider } from "@/_pages/templates/composition.browser"
import { InteractionPreferencesProvider } from "@/entities/preference/index.browser"
import { BatchCopyProvider, MobileBatchCopyProvider } from "@/features/batch-copy/index.browser"
import { SelectedSourceLinesProvider } from "@/features/suggest-template"
import { ActionToastProvider } from "@/shared/ui/action-toast"

import { BatchCopySelection } from "../composition/batch-copy-selection"
import { DatabaseProvider } from "./database-provider"

export function PersonalNotesProvider({ children }: PropsWithChildren) {
  return (
    <DatabaseProvider>
      <ActionToastProvider>
        <InteractionPreferencesProvider>
          <SelectedSourceLinesProvider>
            <TemplateDataProvider>
              <NoteSessionProvider>
                <MobileBatchCopyProvider>
                  <BatchCopyProvider>
                    <BatchCopySelection />
                    <TextAnalysisProvider>
                      <NotesDataProvider>{children}</NotesDataProvider>
                    </TextAnalysisProvider>
                  </BatchCopyProvider>
                </MobileBatchCopyProvider>
              </NoteSessionProvider>
            </TemplateDataProvider>
          </SelectedSourceLinesProvider>
        </InteractionPreferencesProvider>
      </ActionToastProvider>
    </DatabaseProvider>
  )
}
