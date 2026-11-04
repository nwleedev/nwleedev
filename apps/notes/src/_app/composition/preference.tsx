import type { PropsWithChildren } from "react"

import { InteractionPreferencesProvider } from "@/_pages/settings/composition"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"
import { usePreferenceServices } from "./use-preference-services"

type PreferenceProps = PropsWithChildren<{
  database: PersonalNotesDatabase
}>

export function Preference({ children, database }: PreferenceProps) {
  const { now, repository } = usePreferenceServices(database)

  return (
    <InteractionPreferencesProvider now={now} repository={repository}>
      {children}
    </InteractionPreferencesProvider>
  )
}
