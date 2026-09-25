import type { PropsWithChildren } from "react"

import { TextAnalysisProvider } from "@/_pages/analysis/composition"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"
import { useAnalysisAdapters } from "./use-analysis-adapters"

type AnalysisProps = PropsWithChildren<{
  database: PersonalNotesDatabase
}>

export function Analysis({ children, database }: AnalysisProps) {
  const { analyzer, now, reader } = useAnalysisAdapters(database)

  return (
    <TextAnalysisProvider analyzer={analyzer} now={now} reader={reader}>
      {children}
    </TextAnalysisProvider>
  )
}
