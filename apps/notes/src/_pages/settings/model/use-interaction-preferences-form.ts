import type { ChangeEvent } from "react"
import { useForm } from "react-hook-form"

import type { InteractionPreferences } from "@/entities/preference"

type InteractionPreferenceFields = {
  batchCopyReorderButtonsEnabled: boolean
  batchCopyShortcutEnabled: boolean
}

type InteractionPreferencesFormOptions = {
  preferences: InteractionPreferences
  saveBatchCopyReorderButtons(enabled: boolean): Promise<boolean>
  saveBatchCopyShortcut(enabled: boolean): Promise<boolean>
}

export function useInteractionPreferencesForm({
  preferences,
  saveBatchCopyReorderButtons,
  saveBatchCopyShortcut,
}: InteractionPreferencesFormOptions) {
  const { getValues, register, reset } = useForm<InteractionPreferenceFields>({
    defaultValues: {
      batchCopyReorderButtonsEnabled:
        preferences.batchCopyReorderButtonsEnabled,
      batchCopyShortcutEnabled: preferences.batchCopyShortcutEnabled,
    },
  })
  const reorderButtonsRegistration = register(
    "batchCopyReorderButtonsEnabled",
  )
  const shortcutRegistration = register("batchCopyShortcutEnabled")

  async function savePreference(
    field: keyof InteractionPreferenceFields,
    enabled: boolean,
    save: (value: boolean) => Promise<boolean>,
  ) {
    const saved = await save(enabled)
    const storedValue = saved ? enabled : preferences[field]

    reset({ ...getValues(), [field]: storedValue })
  }

  function changeShortcut(event: ChangeEvent<HTMLInputElement>) {
    void shortcutRegistration.onChange(event)
    void savePreference(
      "batchCopyShortcutEnabled",
      event.currentTarget.checked,
      saveBatchCopyShortcut,
    )
  }

  function changeReorderButtons(event: ChangeEvent<HTMLInputElement>) {
    void reorderButtonsRegistration.onChange(event)
    void savePreference(
      "batchCopyReorderButtonsEnabled",
      event.currentTarget.checked,
      saveBatchCopyReorderButtons,
    )
  }

  return {
    changeReorderButtons,
    changeShortcut,
    reorderButtonsRegistration,
    shortcutRegistration,
  }
}
