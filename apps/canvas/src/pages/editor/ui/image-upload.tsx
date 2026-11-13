import { FileTrigger } from "react-aria-components/FileTrigger"
import { Button } from "react-aria-components/Button"
import { useState } from "react"

import type { Asset } from "@/entities/project"

import { readImage } from "../model/read-image"

export function ImageUpload({ add }: { add: (image: Omit<Asset, "projectId">) => Promise<void> }) {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function upload(files: FileList | null) {
    const file = files?.[0]
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
      <FileTrigger acceptedFileTypes={["image/*"]} onSelect={(files) => void upload(files)}>
        <Button className="editor-image-upload" type="button" aria-label="이미지 추가" isDisabled={pending}>
          <svg viewBox="1.5 -1 24 24" aria-hidden="true">
            <path d="M14 5H4v14h16v-7M4 16l5-5 4 4 2-2 5 5M19 3v8m-4-4h8" />
          </svg>
        </Button>
      </FileTrigger>
      {failed && <p role="alert">이미지를 추가하지 못했습니다.</p>}
    </div>
  )
}
