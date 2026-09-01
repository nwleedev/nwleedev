import type { FormEvent, KeyboardEvent } from "react"

import { Button } from "@/shared/ui/button"
import { Textarea } from "@/shared/ui/textarea"

type NoteEditorProps = {
  content: string
  errorMessage: string
  pending: boolean
  onChange(content: string): void
  onComplete(): Promise<void>
}

export function NoteEditor({
  content,
  errorMessage,
  onChange,
  onComplete,
  pending,
}: NoteEditorProps) {
  const submitLabel = pending ? "저장 중" : "완료"

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onComplete()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Escape" || event.nativeEvent.isComposing) {
      return
    }

    event.preventDefault()
    void onComplete()
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col gap-3" onSubmit={handleSubmit}>
      <Textarea
        aria-label="메모 내용"
        autoFocus
        className="min-h-28 flex-1"
        disabled={pending}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder="메모를 입력하세요"
        value={content}
      />
      <div className="flex items-center justify-end gap-3">
        {errorMessage ? (
          <p className="mr-auto text-sm font-medium text-danger" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <Button disabled={pending} type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
