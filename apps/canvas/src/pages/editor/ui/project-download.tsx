import { useState } from "react"

const releaseDelay = 60_000
const unsafeFilenameCharacters = /[<>:"/\\|?*\u0000-\u001f]/gu

export function ProjectDownload({ title, prepare }: {
  title: string
  prepare: () => Promise<Blob>
}) {
  const [status, setStatus] = useState<"idle" | "pending" | "failed">("idle")

  async function download() {
    setStatus("pending")
    try {
      const blob = await prepare()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const name = title.replace(unsafeFilenameCharacters, "_").trim()
      link.href = url
      link.download = `${name || "canvas"}.nwlee.zip`
      try {
        link.click()
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), releaseDelay)
      }
      setStatus("idle")
    } catch {
      setStatus("failed")
    }
  }

  return (
    <div>
      <button type="button" disabled={status === "pending"} onClick={() => void download()}>
        {status === "pending" ? "편집 파일 준비 중" : "편집 파일 저장"}
      </button>
      {status === "failed" && <p role="alert">편집 파일을 저장하지 못했습니다.</p>}
    </div>
  )
}
