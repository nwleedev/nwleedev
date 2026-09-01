"use client"

import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import { PageHeading } from "@/shared/ui/page-heading"
import { StatusNotice } from "@/shared/ui/status-notice"

import { useInteractionPreferences } from "../model/interaction-preferences-provider"

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
      <section className="mt-5 rounded-panel border border-line bg-surface-raised px-5 py-6 shadow-note sm:px-6">
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
