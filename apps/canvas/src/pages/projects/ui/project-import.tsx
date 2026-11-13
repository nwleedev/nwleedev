import { useEffect, useRef, useState } from "react"

import type { ProjectDocument } from "@/entities/project"

export type ReadArchive = (file: File, signal: AbortSignal) => Promise<
  { project: ProjectDocument } | { issue: "unsupported-version" }
>

type Props = {
  read: ReadArchive
  restore: (project: ProjectDocument) => Promise<void>
}

type ImportState =
  | { status: "reading" | "invalid" | "unsupported-version"; name: string }
  | { status: "ready" | "saving" | "failed"; name: string; project: ProjectDocument }

function Preview({ original }: { original: Blob }) {
  const image = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const element = image.current
    if (!element) return
    const url = URL.createObjectURL(original)
    element.src = url
    return () => URL.revokeObjectURL(url)
  }, [original])
  return <img ref={image} alt="프로젝트 대표 이미지" />
}

export function ProjectImport({ read, restore }: Props) {
  const trigger = useRef<HTMLButtonElement>(null)
  const picker = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const request = useRef<AbortController | null>(null)
  const [state, setState] = useState<ImportState>()

  useEffect(() => () => request.current?.abort(), [])

  async function inspect(file: File) {
    request.current?.abort()
    const attempt = new AbortController()
    request.current = attempt
    setState({ status: "reading", name: file.name })
    dialog.current?.showModal()
    try {
      const inspected = await read(file, attempt.signal)
      if (attempt.signal.aborted) return
      if ("issue" in inspected) {
        setState({ status: inspected.issue, name: file.name })
        return
      }
      setState({ status: "ready", name: file.name, project: inspected.project })
    } catch {
      if (!attempt.signal.aborted) setState({ status: "invalid", name: file.name })
    }
  }

  async function confirm() {
    if (!state || !("project" in state) || state.status === "saving") return
    setState({ ...state, status: "saving" })
    try {
      await restore(state.project)
    } catch {
      setState({ ...state, status: "failed" })
    }
  }

  function reset() {
    if (dialog.current?.open) return
    request.current?.abort()
    request.current = null
    setState(undefined)
    trigger.current?.focus()
  }

  const project = state && "project" in state ? state.project : undefined
  const status = state?.status
  const original = project?.assets.find(({ id }) => id === project.placements[0]?.assetId)?.original

  return (
    <>
      <button ref={trigger} type="button" aria-label="불러오기" title="불러오기" onClick={() => picker.current?.click()}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5h6l2 2h10v12H3V7Zm9 3v6m-3-3 3 3 3-3" /></svg>
      </button>
      <input ref={picker} type="file" accept=".zip,application/zip" aria-label="편집용 ZIP 선택" hidden onChange={({ currentTarget }) => {
        const file = currentTarget.files?.[0]
        currentTarget.value = ""
        if (file) void inspect(file)
      }} />
      <dialog ref={dialog} className="project-import" aria-labelledby="project-import-title" onClose={reset} onCancel={(event) => {
        if (status === "saving") event.preventDefault()
      }}>
        <h2 id="project-import-title">프로젝트 불러오기</h2>
        <p>{state?.name}</p>
        {status === "reading" && <p role="status">파일을 확인하는 중입니다.</p>}
        {status === "invalid" && <p role="alert">편집 파일을 읽을 수 없습니다.</p>}
        {status === "unsupported-version" && <p role="alert">이 버전의 편집 파일은 열 수 없습니다.</p>}
        {status === "failed" && <p role="alert">프로젝트를 저장하지 못했습니다. 다시 시도해 주세요.</p>}
        {project && (
          <div className="project-preview">
            {original ? <Preview original={original} /> : <span>빈 캔버스</span>}
          </div>
        )}
        <div className="project-import-actions">
          <button type="button" disabled={status === "saving"} onClick={() => dialog.current?.close()}>취소</button>
          <button type="button" disabled={!project || status === "saving"} onClick={() => void confirm()}>불러오기</button>
        </div>
      </dialog>
    </>
  )
}
