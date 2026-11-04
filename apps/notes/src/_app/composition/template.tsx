import type { PropsWithChildren } from "react"

import { TemplateDataProvider } from "@/_pages/templates/composition"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"
import { useTemplateServices } from "./use-template-services"

type TemplateProps = PropsWithChildren<{
  database: PersonalNotesDatabase
}>

export function Template({ children, database }: TemplateProps) {
  const { clipboard, createId, now, repository } =
    useTemplateServices(database)

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
