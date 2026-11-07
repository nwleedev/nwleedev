import type { RefObject, SyntheticEvent } from "react"

import { Button } from "@/shared/ui/button"

type UnsavedChangesDialogProps = {
  continueButton: RefObject<HTMLButtonElement | null>
  dialog: RefObject<HTMLDialogElement | null>
  titleId: string
  onCancel(event: SyntheticEvent<HTMLDialogElement>): void
  onContinue(): void
  onDiscard(): void
}

export function UnsavedChangesDialog({
  continueButton,
  dialog,
  onCancel,
  onContinue,
  onDiscard,
  titleId,
}: UnsavedChangesDialogProps) {
  return (
    <dialog
      aria-labelledby={titleId}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] max-w-none rounded-panel border border-line bg-surface-raised p-5 text-ink shadow-floating backdrop:bg-ink/25"
      onCancel={onCancel}
      ref={dialog}
    >
      <div className="grid gap-5">
        <div className="grid gap-2">
          <h2 className="text-base font-semibold" id={titleId}>
            저장하지 않은 내용이 있어요
          </h2>
          <p className="text-sm leading-6 text-soft-ink">
            저장되지 않은 내용이 있습니다. 나갈까요?
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onDiscard} tone="quiet">
            나가기
          </Button>
          <Button
            autoFocus
            onClick={onContinue}
            ref={continueButton}
          >
            계속 편집
          </Button>
        </div>
      </div>
    </dialog>
  )
}
