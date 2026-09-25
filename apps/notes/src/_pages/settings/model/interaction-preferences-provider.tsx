"use client"

import type { PropsWithChildren } from "react"

import {
  InteractionPreferencesContext,
  useInteractionPreferencesState,
  type InteractionPreferencesDependencies,
} from "./use-interaction-preferences-state"

export function InteractionPreferencesProvider({
  children,
  ...dependencies
}: PropsWithChildren<InteractionPreferencesDependencies>) {
  const value = useInteractionPreferencesState(dependencies)

  return <InteractionPreferencesContext value={value}>{children}</InteractionPreferencesContext>
}

export { useInteractionPreferences } from "./use-interaction-preferences-state"
