import { useLayoutEffect, useRef, useState } from "react"

import type { MemoUpdate } from "@/entities/project"

import { bindMemoInput } from "../model/memo-input"

type Props = {
  memoId: string
  updates: readonly MemoUpdate[]
  save: (update: MemoUpdate) => Promise<void>
  preserve: (id: string, value: string) => void
  registerFlush: (id: string, flush: () => Promise<void>) => () => void
}

export function MemoField({ memoId, updates, save, preserve, registerFlush }: Props) {
  const element = useRef<HTMLTextAreaElement>(null)
  const binding = useRef<ReturnType<typeof bindMemoInput> | null>(null)
  const [failed, setFailed] = useState(false)

  useLayoutEffect(() => {
    if (!element.current) return
    const input = bindMemoInput(element.current, memoId, save, setFailed)
    binding.current = input
    const unregister = registerFlush(memoId, input.flush)
    return () => {
      unregister()
      const unsaved = input.unsaved()
      if (unsaved !== undefined) preserve(memoId, unsaved)
      binding.current = null
      input.dispose()
    }
  }, [memoId, preserve, registerFlush, save])

  useLayoutEffect(() => {
    binding.current?.merge(updates)
  }, [memoId, save, updates])

  return (
    <div className="editor-memo-field">
      <label>
        메모
        <textarea ref={element} />
      </label>
      {failed && <button type="button" onClick={() => void binding.current?.persist()}>메모 저장 다시 시도</button>}
    </div>
  )
}
