"use client"

import type { PropsWithChildren } from "react"

import { useBrowserPreferences } from "../api/use-browser-preferences"

import {
  InteractionPreferencesContext,
  useInteractionPreferencesState,
} from "./use-interaction-preferences-state"

export function InteractionPreferencesProvider({
  children,
}: PropsWithChildren) {
  const dependencies = useBrowserPreferences()
  const value = useInteractionPreferencesState(dependencies)

  return <InteractionPreferencesContext value={value}>{children}</InteractionPreferencesContext>
}

export { useInteractionPreferences } from "./use-interaction-preferences-state"
