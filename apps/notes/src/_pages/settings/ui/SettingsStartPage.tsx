"use client"

import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import { PageHeading } from "@/shared/ui/page-heading"
import { StatusNotice } from "@/shared/ui/status-notice"

import { useInteractionPreferences } from "../model/InteractionPreferencesProvider"

export function SettingsStartPage() {
  const preferences = useInteractionPreferences()

  return (
    <main
      className="min-h-screen px-4 py-7 sm:px-7 sm:py-10 xl:px-10"
      id="main-content"
    >
      <PageHeading title="설정" />
      <section className="mt-6 border-y-2 border-ink bg-surface px-5 py-6 sm:px-7">
        {"preferences" in preferences ? (
          <div>
            <Checkbox
              checked={preferences.preferences.metaClickEnabled}
              description="메모 본문에서만 적용됩니다."
              disabled={preferences.status === "saving"}
              label="Command+클릭으로 누적"
              name="metaClickEnabled"
              onChange={(event) => {
                void preferences.setMetaClickEnabled(event.currentTarget.checked)
              }}
            />
            {preferences.status === "saving" ? (
              <div className="mt-5">
                <StatusNotice>설정 저장 중</StatusNotice>
              </div>
            ) : null}
            {preferences.status === "save-failure" ? (
              <div className="mt-5">
                <StatusNotice kind="error">
                  설정을 저장하지 못했습니다. 다시 변경하세요.
                </StatusNotice>
              </div>
            ) : null}
          </div>
        ) : (
          <StatusNotice
            action={
              preferences.status === "load-failure" ? (
                <Button onClick={preferences.retry} tone="quiet">
                  다시 시도
                </Button>
              ) : undefined
            }
            kind={preferences.status === "load-failure" ? "error" : "status"}
          >
            {preferences.status === "load-failure"
              ? "설정을 불러오지 못했습니다."
              : "설정 불러오는 중"}
          </StatusNotice>
        )}
      </section>
    </main>
  )
}
