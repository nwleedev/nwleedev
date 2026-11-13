import { useState } from "react"

import type { Memo } from "@/entities/project"

const sides = { top: "위", right: "오른쪽", bottom: "아래", left: "왼쪽" } satisfies Record<Memo["side"], string>

type Props = {
  memo?: Memo
  onAdd: () => Promise<void>
  onChange: (id: string, side: Memo["side"]) => Promise<void>
}

export function MemoAttachment({ memo, onAdd, onChange }: Props) {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function commit(operation: () => Promise<void>) {
    setPending(true)
    setFailed(false)
    try {
      await operation()
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      {memo ? (
        <label>
          메모 부착 방향
          <select value={memo.side} disabled={pending} onChange={({ currentTarget }) => {
            const side = currentTarget.value as Memo["side"]
            void commit(() => onChange(memo.id, side))
          }}>
            {Object.entries(sides).map(([side, label]) => <option key={side} value={side}>{label}</option>)}
          </select>
        </label>
      ) : (
        <button type="button" disabled={pending} onClick={() => void commit(onAdd)}>메모 추가</button>
      )}
      {failed && <p role="alert">메모 부착 정보를 저장하지 못했습니다.</p>}
    </div>
  )
}
