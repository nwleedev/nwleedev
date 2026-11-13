import { Button } from "react-aria-components/Button"
import { useState } from "react"

import { downloadBlob, downloadName } from "../model/download"

export function ProjectDownload({ title, prepare }: {
  title: string
  prepare: () => Promise<Blob>
}) {
  const [status, setStatus] = useState<"idle" | "pending" | "failed">("idle")

  async function download() {
    setStatus("pending")
    try {
      const blob = await prepare()
      downloadBlob(blob, downloadName(title, "zip"))
      setStatus("idle")
    } catch {
      setStatus("failed")
    }
  }

  return (
    <div>
      <Button type="button" isDisabled={status === "pending"} onPress={() => void download()}>
        {status === "pending" ? "편집 파일 준비 중" : "편집 파일 저장"}
      </Button>
      {status === "failed" && <p role="alert">편집 파일을 저장하지 못했습니다.</p>}
    </div>
  )
}
