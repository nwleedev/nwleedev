import type { PropsWithChildren } from "react"

import { InteractionPreferencesProvider } from "@/_pages/settings/composition"

import { usePreferenceServices } from "./use-preference-services"

export function Preference({ children }: PropsWithChildren) {
  const { now, repository } = usePreferenceServices()

  return (
    <InteractionPreferencesProvider now={now} repository={repository}>
      {children}
    </InteractionPreferencesProvider>
  )
}
