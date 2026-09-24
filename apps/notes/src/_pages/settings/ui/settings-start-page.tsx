"use client"

import { type ChangeEvent } from "react"
import { useForm } from "react-hook-form"

import type { InteractionPreferences } from "@/entities/preference"

import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import { PageHeading } from "@/shared/ui/page-heading"
import { StatusNotice } from "@/shared/ui/status-notice"

import { useInteractionPreferences } from "../model/interaction-preferences-provider"

type InteractionPreferenceFields = {
  batchCopyReorderButtonsEnabled: boolean
  batchCopyShortcutEnabled: boolean
}

type InteractionPreferencesFormProps = {
  preferences: InteractionPreferences
  saving: boolean
  saveBatchCopyReorderButtons(enabled: boolean): Promise<boolean>
  saveBatchCopyShortcut(enabled: boolean): Promise<boolean>
}

function InteractionPreferencesForm({
  preferences,
  saveBatchCopyReorderButtons,
  saveBatchCopyShortcut,
  saving,
}: InteractionPreferencesFormProps) {
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

  return (
    <div className="grid gap-5">
      <Checkbox
        description="메모 본문에서만 적용됩니다."
        disabled={saving}
        label="Command+Option+클릭으로 일괄 복사에 추가"
        {...shortcutRegistration}
        onChange={changeShortcut}
      />
      <Checkbox
        description="각 항목의 더보기에서 현재 실행할 수 있는 이동 동작을 표시합니다."
        disabled={saving}
        label="일괄 복사 항목에 위로 이동과 아래로 이동 표시"
        {...reorderButtonsRegistration}
        onChange={changeReorderButtons}
      />
    </div>
  )
}

export function SettingsStartPage() {
  const preferenceState = useInteractionPreferences()
  const loadFailed = preferenceState.status === "load-failure"
  const loadNoticeKind = loadFailed ? "error" : "status"
  const loadStatusText = loadFailed
    ? "설정을 불러오지 못했습니다."
    : "설정 불러오는 중"

  return (
    <main
      className="px-4 py-5 sm:px-6 sm:py-7 xl:px-8"
      id="main-content"
    >
      <PageHeading density="compact" title="설정" />
      <section className="mt-5">
        {"preferences" in preferenceState ? (
          <div>
            <InteractionPreferencesForm
              preferences={preferenceState.preferences}
              saveBatchCopyReorderButtons={
                preferenceState.setBatchCopyReorderButtonsEnabled
              }
              saveBatchCopyShortcut={
                preferenceState.setBatchCopyShortcutEnabled
              }
              saving={preferenceState.status === "saving"}
            />
            {preferenceState.status === "saving" ? (
              <div className="mt-5">
                <StatusNotice>
                  <p>설정 저장 중</p>
                </StatusNotice>
              </div>
            ) : null}
            {preferenceState.status === "save-failure" ? (
              <div className="mt-5">
                <StatusNotice kind="error">
                  <p>설정을 저장하지 못했습니다. 다시 변경하세요.</p>
                </StatusNotice>
              </div>
            ) : null}
          </div>
        ) : (
          <StatusNotice kind={loadNoticeKind}>
            <p>{loadStatusText}</p>
            {loadFailed ? (
              <Button onClick={preferenceState.retry} tone="quiet">
                다시 시도
              </Button>
            ) : null}
          </StatusNotice>
        )}
      </section>
    </main>
  )
}
