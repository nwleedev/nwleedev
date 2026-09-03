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
  batchCopyShortcutEnabled: boolean
}

type InteractionPreferencesFormProps = {
  preferences: InteractionPreferences
  saving: boolean
  saveBatchCopyShortcut(enabled: boolean): Promise<boolean>
}

function InteractionPreferencesForm({
  preferences,
  saveBatchCopyShortcut,
  saving,
}: InteractionPreferencesFormProps) {
  const { register, reset } = useForm<InteractionPreferenceFields>({
    defaultValues: {
      batchCopyShortcutEnabled: preferences.batchCopyShortcutEnabled,
    },
  })
  const shortcutRegistration = register("batchCopyShortcutEnabled")

  async function saveShortcut(enabled: boolean) {
    const saved = await saveBatchCopyShortcut(enabled)
    const storedValue = saved
      ? enabled
      : preferences.batchCopyShortcutEnabled

    reset({ batchCopyShortcutEnabled: storedValue })
  }

  function changeShortcut(event: ChangeEvent<HTMLInputElement>) {
    void shortcutRegistration.onChange(event)
    void saveShortcut(event.currentTarget.checked)
  }

  return (
    <Checkbox
      description="메모 본문에서만 적용됩니다."
      disabled={saving}
      label="Command+Option+클릭으로 일괄 복사에 추가"
      {...shortcutRegistration}
      onChange={changeShortcut}
    />
  )
}

export function SettingsStartPage() {
  const preferences = useInteractionPreferences()
  const loadFailed = preferences.status === "load-failure"
  const loadNoticeKind = loadFailed ? "error" : "status"
  const loadStatusText = loadFailed
    ? "설정을 불러오지 못했습니다."
    : "설정 불러오는 중"

  return (
    <main
      className="min-h-screen px-4 py-5 sm:px-6 sm:py-7 xl:px-8"
      id="main-content"
    >
      <PageHeading density="compact" title="설정" />
      <section className="mt-5 border-y border-line py-6">
        {"preferences" in preferences ? (
          <div>
            <InteractionPreferencesForm
              preferences={preferences.preferences}
              saveBatchCopyShortcut={preferences.setBatchCopyShortcutEnabled}
              saving={preferences.status === "saving"}
            />
            {preferences.status === "saving" ? (
              <div className="mt-5">
                <StatusNotice>
                  <p>설정 저장 중</p>
                </StatusNotice>
              </div>
            ) : null}
            {preferences.status === "save-failure" ? (
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
              <Button onClick={preferences.retry} tone="quiet">
                다시 시도
              </Button>
            ) : null}
          </StatusNotice>
        )}
      </section>
    </main>
  )
}
