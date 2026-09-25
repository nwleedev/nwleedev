import type { PropsWithChildren } from "react"

import { InteractionPreferencesProvider } from "@/_pages/settings/composition"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"
import { usePreferenceAdapters } from "./use-preference-adapters"

type PreferenceProps = PropsWithChildren<{
  database: PersonalNotesDatabase
}>

export function Preference({ children, database }: PreferenceProps) {
  const { now, repository } = usePreferenceAdapters(database)

  return (
    <InteractionPreferencesProvider now={now} repository={repository}>
      {children}
    </InteractionPreferencesProvider>
  )
}
