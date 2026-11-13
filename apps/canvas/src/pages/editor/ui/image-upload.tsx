import { useRef, useState, type ChangeEvent } from "react"

import type { Asset } from "@/entities/project"

import { readImage } from "../model/read-image"

export function ImageUpload({ add }: { add: (image: Omit<Asset, "projectId">) => Promise<void> }) {
  const picker = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return
    setPending(true)
    setFailed(false)
    try {
      await add(await readImage(file))
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <button className="editor-image-upload" type="button" aria-label="이미지 추가" title="이미지 추가" disabled={pending} onClick={() => picker.current?.click()}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 5H4v14h16v-7M4 16l5-5 4 4 2-2 5 5M19 3v8m-4-4h8" />
        </svg>
      </button>
      <input ref={picker} type="file" accept="image/*" hidden disabled={pending} onChange={(event) => void upload(event)} />
      {failed && <p role="alert">이미지를 추가하지 못했습니다.</p>}
    </div>
  )
}
