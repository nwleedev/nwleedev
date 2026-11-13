import { useState, type ChangeEvent } from "react"

import type { Asset } from "@/entities/project"

import { readImage } from "../model/read-image"

export function ImageUpload({ add }: { add: (image: Omit<Asset, "projectId">) => Promise<void> }) {
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
      <label>
        이미지 추가
        <input type="file" accept="image/*" disabled={pending} onChange={(event) => void upload(event)} />
      </label>
      {failed && <p role="alert">이미지를 추가하지 못했습니다.</p>}
    </div>
  )
}
