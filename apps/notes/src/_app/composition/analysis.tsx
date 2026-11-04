import type { PropsWithChildren } from "react"

import { TextAnalysisProvider } from "@/_pages/analysis/composition"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"
import { useAnalysisServices } from "./use-analysis-services"

type AnalysisProps = PropsWithChildren<{
  database: PersonalNotesDatabase
}>

export function Analysis({ children, database }: AnalysisProps) {
  const { analyzer, now, reader } = useAnalysisServices(database)

  return (
    <TextAnalysisProvider analyzer={analyzer} now={now} reader={reader}>
      {children}
    </TextAnalysisProvider>
  )
}
