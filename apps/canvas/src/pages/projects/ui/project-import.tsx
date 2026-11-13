import { Dialog } from "react-aria-components/Dialog"
import { FileTrigger } from "react-aria-components/FileTrigger"
import { Heading } from "react-aria-components/Heading"
import { Modal, ModalOverlay } from "react-aria-components/Modal"
import { Button } from "react-aria-components/Button"
import { useEffect, useRef, useState } from "react"

import type { ProjectDocument } from "@/entities/project"
import { BlobImage } from "@/shared/ui"

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

export function ProjectImport({ read, restore }: Props) {
  const request = useRef<AbortController | null>(null)
  const [state, setState] = useState<ImportState>()

  useEffect(() => () => request.current?.abort(), [])

  async function inspect(file: File) {
    request.current?.abort()
    const attempt = new AbortController()
    request.current = attempt
    setState({ status: "reading", name: file.name })
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
    request.current?.abort()
    request.current = null
    setState(undefined)
  }

  const project = state && "project" in state ? state.project : undefined
  const status = state?.status
  const original = project?.assets.find(({ id }) => id === project.placements[0]?.assetId)?.original

  return (
    <>
      <FileTrigger acceptedFileTypes={[".zip", "application/zip"]} onSelect={(files) => {
        const file = files?.[0]
        if (file) void inspect(file)
      }}>
        <Button type="button" aria-label="불러오기">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5h6l2 2h10v12H3V7Zm9 3v6m-3-3 3 3 3-3" /></svg>
        </Button>
      </FileTrigger>
      <ModalOverlay className="project-import-overlay" isOpen={!!state}
        isKeyboardDismissDisabled={status === "saving"} onOpenChange={(open) => {
          if (!open) reset()
        }}>
        <Modal className="project-import">
          <Dialog>
            <Heading slot="title">프로젝트 불러오기</Heading>
            <p>{state?.name}</p>
            {status === "reading" && <p role="status">파일을 확인하는 중입니다.</p>}
            {status === "invalid" && <p role="alert">편집 파일을 읽을 수 없습니다.</p>}
            {status === "unsupported-version" && <p role="alert">이 버전의 편집 파일은 열 수 없습니다.</p>}
            {status === "failed" && <p role="alert">프로젝트를 저장하지 못했습니다. 다시 시도해 주세요.</p>}
            {project && (
              <div className="project-preview">
                {original ? <BlobImage original={original} alt="프로젝트 대표 이미지" /> : <span>빈 캔버스</span>}
              </div>
            )}
            <div className="project-import-actions">
              <Button type="button" isDisabled={status === "saving"} onPress={reset}>취소</Button>
              <Button type="button" isDisabled={!project || status === "saving"} onPress={() => void confirm()}>불러오기</Button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  )
}
