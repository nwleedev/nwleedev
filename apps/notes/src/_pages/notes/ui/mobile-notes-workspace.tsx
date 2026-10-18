"use client"

import { useRef } from "react"

import type { Note } from "@/entities/note"
import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"
import { useBatchCopyEditor } from "@/features/edit-batch-copy"
import { usePointerReorder } from "@/shared/lib/pointer-reorder"
import { Button } from "@/shared/ui/button"
import { useActionToast } from "@/shared/ui/action-toast"
import { IconButton } from "@/shared/ui/icon-button"
import { BatchCopyIcon, GripIcon, PlusIcon } from "@/shared/ui/icons"
import { MobileNavigation, type SavedBatchCopyLink } from "@/widgets/application-navigation"

import { useNotesData } from "../model/notes-data-provider"
import { useNoteSession } from "../model/note-session-provider"
import { useNoteCopyAction } from "../model/use-note-copy-action"
import { useMobileBatchCopyNavigation } from "../model/use-mobile-batch-copy-navigation"
import { useMobileNoteActionSheet } from "../model/use-mobile-note-action-sheet"
import { useMobileNoteOrder } from "../model/use-mobile-note-order"
import { MobileNoteActionSheet } from "./mobile-note-action-sheet"
import { MobileNoteCard } from "./mobile-note-card"

type MobileNotesWorkspaceProps = {
  creationPending: boolean
  notes: readonly Note[]
  onCreate(): Promise<void>
}

export function MobileNotesWorkspace({ creationPending, notes, onCreate }: MobileNotesWorkspaceProps) {
  const toast = useActionToast()
  const batchCopy = useMobileBatchCopy()
  const copy = useNoteCopyAction()
  const navigation = useMobileBatchCopyNavigation()
  const savedBatchCopy = useBatchCopyEditor()
  const { removeNote, restoreNote } = useNotesData()
  const { forgetNote } = useNoteSession()
  const createButton = useRef<HTMLButtonElement>(null)
  const order = useMobileNoteOrder(notes)
  const reorder = usePointerReorder({ disabled: order.pending || !order.ready, items: order.notes, onMove: order.move })
  const actions = useMobileNoteActionSheet({ createButton, noteIds: order.noteIds, notes, onForget: forgetNote, onRemove: removeNote, onRestore: restoreNote })
  const count = batchCopy.draft?.entries.length ?? 0
  const countText = count.toLocaleString("ko-KR")
  let savedBatchCopyLink: SavedBatchCopyLink = null
  if (savedBatchCopy.status === "ready") savedBatchCopyLink = { count: savedBatchCopy.items.length, status: "ready" }
  if (savedBatchCopy.status === "failure") savedBatchCopyLink = { onRetry: savedBatchCopy.retry, status: "failure" }

  async function addToBatchCopy(note: Note) {
    const result = await batchCopy.add(note)
    if (result.status === "failure") {
      toast.show({ actionLabel: "다시 시도", kind: "error", message: "일괄 복사 항목을 추가하지 못했습니다. 다시 시도하세요.", onAction: () => void addToBatchCopy(note) })
    }
  }

  async function proceedToConfirmation() {
    if (await navigation.confirm()) return
    toast.show({ actionLabel: "다시 시도", kind: "error", message: "일괄 복사 확인 화면으로 이동하지 못했습니다. 다시 시도하세요.", onAction: () => void proceedToConfirmation() })
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface-raised/95 px-3 backdrop-blur-sm">
        <div className="flex items-center gap-3"><MobileNavigation pathname="/" savedBatchCopy={savedBatchCopyLink} /><h1 className="text-lg font-semibold">메모</h1></div>
        <IconButton
          aria-label={`일괄 복사 확인, ${countText}개`}
          className="relative h-[var(--notes-touch-target)] w-[var(--notes-touch-target)]"
          disabled={count === 0}
          onClick={proceedToConfirmation}
          onFocus={navigation.prefetch}
          onPointerDown={navigation.prefetch}
          role="link"
        >
          <BatchCopyIcon className="size-6" />
          {count > 0 ? <span aria-hidden="true" className="absolute bottom-0 right-0 flex min-h-[var(--notes-batch-count-size)] min-w-[var(--notes-batch-count-size)] items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold tabular-nums text-on-accent">{countText}</span> : null}
        </IconButton>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
        {order.failure ? <div className="mb-3 grid gap-2"><p className="text-sm text-danger" role="alert">{order.failure}</p><Button onClick={order.retry} tone="quiet">다시 불러오기</Button></div> : null}
        <p aria-live="polite" className="sr-only" role="status">{reorder.announcement}</p>
        <ol className="grid gap-3" ref={reorder.list}>
          {order.notes.map((note, index) => (
            <li
              className="relative data-[dragging=true]:z-10 data-[dragging=true]:-translate-y-1 data-[dragging=true]:shadow-floating data-[drop=before]:before:absolute data-[drop=before]:before:-top-2 data-[drop=before]:before:left-0 data-[drop=before]:before:right-0 data-[drop=before]:before:h-1 data-[drop=before]:before:bg-danger data-[drop=after]:after:absolute data-[drop=after]:after:-bottom-2 data-[drop=after]:after:left-0 data-[drop=after]:after:right-0 data-[drop=after]:after:h-1 data-[drop=after]:after:bg-danger"
              data-dragging={reorder.drag?.entryId === note.id}
              data-drop={dropPlacement(reorder.drag, index)}
              data-reorder-id={note.id}
              key={note.id}
            >
              <MobileNoteCard
                disabled={false}
                dragHandle={<button aria-label={`${note.content.split("\n")[0] || "빈 메모"} 이동`} className="flex min-h-[var(--notes-touch-target)] w-full touch-none cursor-grab items-center justify-center rounded-control border-0 bg-transparent text-icon active:cursor-grabbing disabled:opacity-45" disabled={order.pending || !order.ready} onLostPointerCapture={reorder.onPointerCancel} onPointerCancel={reorder.onPointerCancel} onPointerDown={(event) => reorder.onPointerDown(event, note.id, index)} onPointerMove={reorder.onPointerMove} onPointerUp={reorder.onPointerUp} ref={(element) => reorder.registerHandle(note.id, element)} type="button"><GripIcon className="size-5" /></button>}
                note={note}
                onAddToBatchCopy={addToBatchCopy}
                onCopy={copy}
                onOpenActions={actions.open}
              />
            </li>
          ))}
        </ol>
      </div>
      <IconButton aria-label={creationPending ? "메모 만드는 중" : "새 메모"} className="absolute bottom-[max(var(--notes-mobile-action-inset),env(safe-area-inset-bottom))] right-[var(--notes-mobile-action-inset)] z-20 h-[var(--notes-mobile-action-size)] w-[var(--notes-mobile-action-size)] rounded-full bg-action text-action-ink shadow-floating hover:bg-action/90" disabled={creationPending} onClick={onCreate} ref={createButton}>
        <PlusIcon />
      </IconButton>
      <MobileNoteActionSheet onAdd={addToBatchCopy} onCopy={copy} sheet={actions.view} />
    </div>
  )
}

function dropPlacement(drag: { sourceIndex: number; targetIndex: number | null } | null, index: number) {
  if (drag === null || drag.targetIndex === null || drag.targetIndex === drag.sourceIndex) return undefined
  if (drag.targetIndex !== index) return undefined
  return drag.targetIndex < drag.sourceIndex ? "before" : "after"
}
