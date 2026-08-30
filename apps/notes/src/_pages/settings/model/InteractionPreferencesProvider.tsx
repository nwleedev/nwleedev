"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react"

import type {
  InteractionPreferences,
  InteractionPreferencesRepository,
} from "@/entities/preference"

type PreferencesState =
  | { status: "loading" }
  | { preferences: InteractionPreferences; status: "ready" | "saving" }
  | { status: "load-failure" }
  | { preferences: InteractionPreferences; status: "save-failure" }

type InteractionPreferencesContextValue = PreferencesState & {
  retry(): void
  setMetaClickEnabled(enabled: boolean): Promise<void>
}

const InteractionPreferencesContext =
  createContext<InteractionPreferencesContextValue | null>(null)

const initialPreferences: InteractionPreferences = {
  metaClickEnabled: true,
  updatedAt: "1970-01-01T00:00:00.000Z",
}

async function readPreferences(
  repository: InteractionPreferencesRepository,
): Promise<PreferencesState> {
  try {
    return {
      preferences: (await repository.get()) ?? initialPreferences,
      status: "ready",
    }
  } catch {
    return { status: "load-failure" }
  }
}

type InteractionPreferencesProviderProps = PropsWithChildren<{
  now(): string
  repository: InteractionPreferencesRepository
}>

export function InteractionPreferencesProvider({
  children,
  now,
  repository,
}: InteractionPreferencesProviderProps) {
  const [state, setState] = useState<PreferencesState>({ status: "loading" })

  useEffect(() => {
    let active = true
    void readPreferences(repository).then((nextState) => {
      if (active) {
        setState(nextState)
      }
    })

    return () => {
      active = false
    }
  }, [repository])

  function retry() {
    setState({ status: "loading" })
    void readPreferences(repository).then(setState)
  }

  async function setMetaClickEnabled(enabled: boolean) {
    if (!("preferences" in state) || state.status === "saving") {
      return
    }

    const previous = state.preferences
    setState({ preferences: previous, status: "saving" })

    try {
      const preferences = await repository.save({
        metaClickEnabled: enabled,
        updatedAt: now(),
      })
      setState({ preferences, status: "ready" })
    } catch {
      setState({ preferences: previous, status: "save-failure" })
    }
  }

  return (
    <InteractionPreferencesContext
      value={{ ...state, retry, setMetaClickEnabled }}
    >
      {children}
    </InteractionPreferencesContext>
  )
}

export function useInteractionPreferences() {
  const context = useContext(InteractionPreferencesContext)

  if (context === null) {
    throw new Error(
      "useInteractionPreferences must be used within InteractionPreferencesProvider",
    )
  }

  return context
}
