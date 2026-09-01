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
        </StatusNotice>
      ) : null}
    </>
  )
}
