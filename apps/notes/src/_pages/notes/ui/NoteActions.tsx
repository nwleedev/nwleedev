import Link from "next/link"

import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"

export type NoteInteractionNotice = {
  kind: "error" | "status"
  message: string
  retry: "accumulate" | "copy" | "remove" | null
}

type NoteActionsProps = {
  accumulationReady: boolean
  notice: NoteInteractionNotice | null
  pending: boolean
  onAccumulate(): void
  onCopy(): void
  onEdit(): void
  onRetry(): void
}

const settingsLinkClassName =
  "inline-flex min-h-[var(--notes-control-size)] items-center rounded-control border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink hover:border-line-strong hover:bg-canvas"

export function NoteActions({
  accumulationReady,
  notice,
  onAccumulate,
  onCopy,
  onEdit,
  onRetry,
  pending,
}: NoteActionsProps) {
  const accumulationUnavailable = !accumulationReady
  const accumulationAriaDisabled = pending || accumulationUnavailable
  const showClipboardSettings = notice?.retry === "copy"

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button aria-disabled={pending} onClick={onCopy} tone="quiet">
          복사
        </Button>
        <Button
          aria-disabled={accumulationAriaDisabled}
          disabled={accumulationUnavailable}
          onClick={onAccumulate}
          tone="quiet"
        >
          누적
        </Button>
        <Button aria-disabled={pending} onClick={onEdit} tone="quiet">
          편집
        </Button>
      </div>
      {notice ? (
        <StatusNotice kind={notice.kind}>
          <p>{notice.message}</p>
          {notice.retry ? (
            <Button onClick={onRetry} tone="quiet">
              다시 시도
            </Button>
          ) : null}
          {showClipboardSettings ? (
            <Link className={settingsLinkClassName} href="/settings/">
              설정 확인
            </Link>
          ) : null}
        </StatusNotice>
      ) : null}
    </>
  )
}
