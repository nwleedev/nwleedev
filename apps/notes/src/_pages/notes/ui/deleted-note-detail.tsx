import { useRef } from "react"

import type { Note } from "@/entities/note"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { RestoreIcon } from "@/shared/ui/icons"

import { NoteDetailLayout, editorClassName } from "./note-detail-layout"
import { NoteStatusLight } from "./note-status-light"

export function DeletedNoteDetail({ content, restore }: { content: string; restore(): Promise<Note> }) {
  const dialog = useRef<HTMLDialogElement>(null)
  return (
    <NoteDetailLayout.Page>
      <NoteDetailLayout.Header>
        <NoteDetailLayout.Actions>
          <IconButton aria-label="메모 복원" onClick={() => { void restore().catch(() => undefined) }}>
            <RestoreIcon />
          </IconButton>
        </NoteDetailLayout.Actions>
        <NoteDetailLayout.Status>
          <NoteStatusLight status="삭제됨" />
          <button
            className="underline decoration-dotted underline-offset-4"
            onClick={(event) => {
              event.currentTarget.focus({ preventScroll: true })
              dialog.current?.showModal()
            }}
            type="button"
          >
            삭제됨
          </button>
        </NoteDetailLayout.Status>
      </NoteDetailLayout.Header>
      <textarea aria-label="메모 내용" className={editorClassName} disabled value={content} />
      <dialog aria-label="삭제된 메모 안내" className="m-auto max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded-panel border border-line bg-surface-raised p-5 text-ink shadow-floating backdrop:bg-ink/25" ref={dialog}>
        <p>메모가 삭제됐습니다.<br />오른쪽 위의 복원 버튼을 누르면 다시 편집할 수 있습니다.</p>
        <p className="my-4 text-danger">복원하지 않고 나가면 이 메모를 편집할 수 없습니다.</p>
        <Button onClick={() => dialog.current?.close()}>닫기</Button>
      </dialog>
    </NoteDetailLayout.Page>
  )
}
