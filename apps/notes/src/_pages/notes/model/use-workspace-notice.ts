import { useCallback, useRef, useState } from "react"

import type { WorkspaceNotice, WorkspaceNoticeInput } from "./workspace-notice"

const WORKSPACE_NOTICE_DURATION_MS = 5_000

export function useWorkspaceNotice(now: () => string) {
  const [workspaceNotice, setWorkspaceNotice] =
    useState<WorkspaceNotice | null>(null)
  const workspaceNoticeRef = useRef<WorkspaceNotice | null>(null)
  const workspaceNoticeRevision = useRef(0)

  const dismissWorkspaceNotice = useCallback(() => {
    const current = workspaceNoticeRef.current

    workspaceNoticeRef.current = null
    setWorkspaceNotice(null)
    current?.onDismiss?.()
  }, [])

  const showWorkspaceNotice = useCallback((notice: WorkspaceNoticeInput) => {
    const current = workspaceNoticeRef.current

    if (notice.replacement !== "preserve") {
      current?.onDismiss?.()
    }
    workspaceNoticeRevision.current += 1
    const nextNotice = {
      ...notice,
      expiresAtMs:
        notice.expiresAtMs ?? Date.parse(now()) + WORKSPACE_NOTICE_DURATION_MS,
      revision: workspaceNoticeRevision.current,
    }
    workspaceNoticeRef.current = nextNotice
    setWorkspaceNotice(nextNotice)
  }, [now])

  return { workspaceNotice, dismissWorkspaceNotice, showWorkspaceNotice }
}
