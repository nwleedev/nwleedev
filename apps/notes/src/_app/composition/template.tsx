import type { PropsWithChildren } from "react"

import { TemplateDataProvider } from "@/_pages/templates/composition"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"
import { useTemplateAdapters } from "./use-template-adapters"

type TemplateProps = PropsWithChildren<{
  database: PersonalNotesDatabase
}>

export function Template({ children, database }: TemplateProps) {
  const { clipboard, createId, now, repository } =
    useTemplateAdapters(database)

  return (
    <TemplateDataProvider
      clipboard={clipboard}
      createId={createId}
      now={now}
      repository={repository}
    >
      {children}
    </TemplateDataProvider>
  )
}
