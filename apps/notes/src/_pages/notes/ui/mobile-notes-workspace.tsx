"use client"

import type { Note } from "@/entities/note"
import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"
import { useBatchCopyEditor } from "@/features/edit-batch-copy"
import { useActionToast } from "@/shared/ui/action-toast"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { BatchCopyIcon, NavigateBackIcon, PlusIcon } from "@/shared/ui/icons"
import { MobileNavigation, type SavedBatchCopyLink } from "@/widgets/application-navigation"

import { useNoteCopyAction } from "../model/use-note-copy-action"
import { useMobileBatchCopyNavigation } from "../model/use-mobile-batch-copy-navigation"
import { MobileNoteCard } from "./mobile-note-card"

type MobileNotesWorkspaceProps = {
  creationPending: boolean
  notes: readonly Note[]
  onCreate(): Promise<void>
}

export function MobileNotesWorkspace({
  creationPending,
  notes,
  onCreate,
}: MobileNotesWorkspaceProps) {
  const toast = useActionToast()
  const batchCopy = useMobileBatchCopy()
  const copy = useNoteCopyAction()
  const batchCopyNavigation = useMobileBatchCopyNavigation()
  const savedBatchCopy = useBatchCopyEditor()
  const draft = batchCopy.draft
  const collectingDraft = draft?.step === "collecting"
  const collecting =
    (batchCopy.collectionVisible && collectingDraft) ||
    (batchCopyNavigation.leavingCollection && draft?.step === "confirming") ||
    (batchCopyNavigation.restoringCollection && draft?.step === "confirming")
  const count = collecting ? draft.clickCount : 0
  const countText = count.toLocaleString("ko-KR")
  const nextAccessibleName = `다음, ${countText}회 선택`
  let savedBatchCopyLink: SavedBatchCopyLink = null

  if (!collecting && draft === null && savedBatchCopy.status === "ready") {
    savedBatchCopyLink = {
      count: savedBatchCopy.items.length,
      status: "ready",
    }
  }

  if (!collecting && draft === null && savedBatchCopy.status === "failure") {
    savedBatchCopyLink = {
      onRetry: savedBatchCopy.retry,
      status: "failure",
    }
  }

  async function startBatchCopy() {
    await batchCopy.start()
  }

  async function cancelBatchCopy() {
    await batchCopy.cancel()
  }

  async function resetBatchCopy() {
    await batchCopy.reset()
  }

  async function addToBatchCopy(note: Note) {
    const result = await batchCopy.add(note)

    if (result.status === "failure") {
      toast.show({
        actionLabel: "다시 시도",
        kind: "error",
        message: "일괄 복사 항목을 추가하지 못했습니다. 다시 시도하세요.",
        onAction: () => void addToBatchCopy(note),
      })
    }
  }

  async function proceedToConfirmation() {
    if (await batchCopyNavigation.confirm()) {
      return
    }

    toast.show({
      actionLabel: "다시 시도",
      kind: "error",
      message: "일괄 복사 확인 화면으로 이동하지 못했습니다. 다시 시도하세요.",
      onAction: () => void proceedToConfirmation(),
    })
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface-raised/95 px-3 backdrop-blur-sm">
        {collecting ? (
          <IconButton
            aria-label="일괄 복사 끝내기"
            disabled={batchCopy.pending || batchCopyNavigation.leavingCollection}
            onClick={cancelBatchCopy}
            size="compact"
          >
            <NavigateBackIcon />
          </IconButton>
        ) : (
          <MobileNavigation pathname="/" savedBatchCopy={savedBatchCopyLink} />
        )}
        {collecting ? (
          <p className="text-sm font-semibold">일괄 복사</p>
        ) : null}
        {collecting ? (
          <MobileNavigation pathname="/" />
        ) : (
          <IconButton
            aria-label="일괄 복사 시작"
            disabled={batchCopy.pending}
            onClick={startBatchCopy}
            size="compact"
          >
            <BatchCopyIcon />
          </IconButton>
        )}
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
        {notes.map((note) => (
          <MobileNoteCard
            batchCopyActive={collecting}
            disabled={batchCopy.pending}
            key={note.id}
            note={note}
            onAddToBatchCopy={addToBatchCopy}
            onCopy={copy}
          />
        ))}
      </div>
      {!collecting ? (
        <IconButton
          aria-label={creationPending ? "메모 만드는 중" : "새 메모"}
          className="absolute bottom-[max(var(--notes-mobile-action-inset),env(safe-area-inset-bottom))] right-[var(--notes-mobile-action-inset)] z-20 h-[var(--notes-mobile-action-size)] w-[var(--notes-mobile-action-size)] rounded-full bg-action text-action-ink shadow-floating hover:bg-action/90"
          disabled={creationPending}
          onClick={onCreate}
        >
          <PlusIcon />
        </IconButton>
      ) : null}
      {collecting ? (
        <div className="relative z-20 flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface-raised/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm">
          <Button
            disabled={batchCopy.pending || count === 0}
            onClick={resetBatchCopy}
            tone="quiet"
          >
            초기화
          </Button>
          <Button
            aria-label={nextAccessibleName}
            disabled={batchCopy.pending || batchCopyNavigation.leavingCollection || count === 0}
            onClick={proceedToConfirmation}
          >
            <span>다음</span>
            <span
              aria-hidden="true"
              className="min-w-6 text-center tabular-nums"
            >
              {countText}
            </span>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
