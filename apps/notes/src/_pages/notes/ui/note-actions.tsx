import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"

export type NoteInteractionNotice = {
  kind: "error" | "status"
  message: string
  retry: "batch-copy" | "copy" | null
}

type NoteActionsProps = {
  batchCopyReady: boolean
  notice: NoteInteractionNotice | null
  pending: boolean
  onAddToBatchCopy(): void
  onCopy(): void
  onEdit(): void
  onRetry(): void
}

export function NoteActions({
  batchCopyReady,
  notice,
  onAddToBatchCopy,
  onCopy,
  onEdit,
  onRetry,
  pending,
}: NoteActionsProps) {
  const batchCopyUnavailable = !batchCopyReady
  const batchCopyAriaDisabled = pending || batchCopyUnavailable

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button aria-disabled={pending} onClick={onCopy} tone="quiet">
          복사
        </Button>
        <Button
          aria-disabled={batchCopyAriaDisabled}
          disabled={batchCopyUnavailable}
          onClick={onAddToBatchCopy}
          tone="quiet"
        >
          일괄 복사
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
