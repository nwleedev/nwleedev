import {
  createContext,
  useContext,
  useEffect,
  useState,
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
  setBatchCopyReorderButtonsEnabled(enabled: boolean): Promise<boolean>
  setBatchCopyShortcutEnabled(enabled: boolean): Promise<boolean>
}

export const InteractionPreferencesContext =
  createContext<InteractionPreferencesContextValue | null>(null)

const initialPreferences: InteractionPreferences = {
  batchCopyReorderButtonsEnabled: false,
  batchCopyShortcutEnabled: true,
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

export type InteractionPreferencesDependencies = {
  now(): string
  repository: InteractionPreferencesRepository
}

export function useInteractionPreferencesState({
  now,
  repository,
}: InteractionPreferencesDependencies) {
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

  async function savePreferences(
    changes: Partial<Omit<InteractionPreferences, "updatedAt">>,
  ) {
    if (!("preferences" in state) || state.status === "saving") {
      return false
    }

    const previous = state.preferences
    setState({ preferences: previous, status: "saving" })

    try {
      const preferences = await repository.save({
        ...previous,
        ...changes,
        updatedAt: now(),
      })
      setState({ preferences, status: "ready" })
      return true
    } catch {
      setState({ preferences: previous, status: "save-failure" })
      return false
    }
  }

  function setBatchCopyShortcutEnabled(enabled: boolean) {
    return savePreferences({ batchCopyShortcutEnabled: enabled })
  }

  function setBatchCopyReorderButtonsEnabled(enabled: boolean) {
    return savePreferences({ batchCopyReorderButtonsEnabled: enabled })
  }

  return {
    ...state,
    retry,
    setBatchCopyReorderButtonsEnabled,
    setBatchCopyShortcutEnabled,
  }
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
