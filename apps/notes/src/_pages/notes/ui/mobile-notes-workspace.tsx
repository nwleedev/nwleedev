"use client"

import { useRouter } from "next/navigation"

import type { Note } from "@/entities/note"
import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"
import { useBatchCopyEditor } from "@/features/edit-batch-copy"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { BatchCopyIcon, NavigateBackIcon, PlusIcon } from "@/shared/ui/icons"
import { StatusNotice } from "@/shared/ui/status-notice"
import { MobileNavigation, type SavedBatchCopyLink } from "@/widgets/application-navigation"

import { MobileNoteList } from "./mobile-note-list"

type MobileNotesWorkspaceProps = {
  creationPending: boolean
  notes: readonly Note[]
  onCopy(note: Note): Promise<void>
  onCreate(): Promise<Note | null>
  onFailure(message: string, retry?: () => void): void
}

export function MobileNotesWorkspace({
  creationPending,
  notes,
  onCopy,
  onCreate,
  onFailure,
}: MobileNotesWorkspaceProps) {
  const batchCopy = useMobileBatchCopy()
  const savedBatchCopy = useBatchCopyEditor()
  const router = useRouter()
  const draft = batchCopy.status === "ready" ? batchCopy.draft : null
  const collecting = draft?.step === "collecting"
  const count = collecting ? draft.clickCount : 0
  const countText = count.toLocaleString("ko-KR")
  const nextAccessibleName = `다음, ${countText}회 선택`
  const continueBatchCopy = draft?.step === "confirming"
  const batchCopyButtonName = continueBatchCopy
    ? "일괄 복사 계속하기"
    : "일괄 복사 시작"
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
    if (continueBatchCopy) {
      router.push("/batch-copy/")
      return
    }

    const result = await batchCopy.start()

    if (result.status === "failure") {
      onFailure("일괄 복사를 시작하지 못했습니다. 다시 시도하세요.", () => {
        void startBatchCopy()
      })
    }
  }

  async function cancelBatchCopy() {
    const result = await batchCopy.cancel()

    if (result.status === "failure") {
      onFailure("일괄 복사를 끝내지 못했습니다. 다시 시도하세요.", () => {
        void cancelBatchCopy()
      })
    }
  }

  async function resetBatchCopy() {
    const result = await batchCopy.reset()

    if (result.status === "failure") {
      onFailure("일괄 복사 항목을 초기화하지 못했습니다. 다시 시도하세요.", () => {
        void resetBatchCopy()
      })
    }
  }

  async function addToBatchCopy(note: Note) {
    const result = await batchCopy.add(note)

    if (result.status === "failure") {
      onFailure("일괄 복사 항목을 추가하지 못했습니다. 다시 시도하세요.", () => {
        void addToBatchCopy(note)
      })
    }
  }

  async function proceedToConfirmation() {
    const result = await batchCopy.confirm()

    if (result.status === "saved") {
      router.push("/batch-copy/")
      return
    }

    onFailure("일괄 복사 확인 화면으로 이동하지 못했습니다. 다시 시도하세요.", () => {
      void proceedToConfirmation()
    })
  }

  async function createAndOpenNote() {
    const note = await onCreate()

    if (note !== null) {
      const noteId = encodeURIComponent(note.id)
      router.push(`/notes/${noteId}/`)
    }
  }

  return (
    <div className="relative h-full min-h-0 @3xl/note-area:hidden">
      <header className="absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface-raised/95 px-3 backdrop-blur-sm">
        {collecting ? (
          <IconButton
            aria-label="일괄 복사 끝내기"
            disabled={batchCopy.pending}
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
            aria-label={batchCopyButtonName}
            disabled={batchCopy.pending || batchCopy.status !== "ready"}
            onClick={startBatchCopy}
            size="compact"
          >
            <BatchCopyIcon />
          </IconButton>
        )}
      </header>
      {batchCopy.status === "failure" ? (
        <div className="absolute left-3 right-3 top-[4.25rem] z-30">
          <StatusNotice kind="error">
            <p>일괄 복사 작업을 불러오지 못했습니다.</p>
            <Button onClick={batchCopy.retry} tone="quiet">
              다시 시도
            </Button>
          </StatusNotice>
        </div>
      ) : null}
      <MobileNoteList
        batchCopyActive={collecting}
        disabled={batchCopy.pending}
        notes={notes}
        onAddToBatchCopy={addToBatchCopy}
        onCopy={onCopy}
      />
      {!collecting ? (
        <IconButton
          aria-label={creationPending ? "메모 만드는 중" : "새 메모"}
          className="absolute bottom-[max(var(--notes-mobile-action-inset),env(safe-area-inset-bottom))] right-[var(--notes-mobile-action-inset)] z-20 h-[var(--notes-mobile-action-size)] w-[var(--notes-mobile-action-size)] rounded-full bg-action text-action-ink shadow-floating hover:bg-action/90"
          disabled={creationPending}
          onClick={createAndOpenNote}
        >
          <PlusIcon />
        </IconButton>
      ) : null}
      {collecting ? (
        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-end gap-2 border-t border-line bg-surface-raised/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm">
          <Button
            disabled={batchCopy.pending || count === 0}
            onClick={resetBatchCopy}
            tone="quiet"
          >
            초기화
          </Button>
          <Button
            aria-label={nextAccessibleName}
            disabled={batchCopy.pending || count === 0}
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
