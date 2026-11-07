import Link from "next/link"
import type { ComponentProps, PropsWithChildren } from "react"

import { ChevronLeftIcon } from "@/shared/ui/icons"

export const backLinkClassName =
  "inline-flex shrink-0 h-[var(--notes-touch-target)] w-[var(--notes-touch-target)] items-center justify-center rounded-control text-icon hover:bg-canvas hover:text-text active:translate-y-px"

export const editorClassName = "h-full min-h-0 w-full resize-none border-0 bg-surface-raised px-[var(--notes-editor-content-inset)] py-5 text-base leading-7 outline-none"

function EditorPage({ children }: PropsWithChildren) {
  return (
    <main
      className="relative grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] bg-surface-raised"
      id="main-content"
    >
      {children}
    </main>
  )
}

function EditorHeader({ children }: PropsWithChildren) {
  return (
    <header className="flex min-h-[var(--notes-mobile-page-header-height)] min-w-0 items-center border-b border-line bg-surface-raised px-3 py-1">
      {children}
    </header>
  )
}

function EditorActions({ children, onBack }: PropsWithChildren<{ onBack?: ComponentProps<typeof Link>["onClick"] }>) {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-3">
      <Link
        aria-label="메모 목록"
        className={backLinkClassName}
        href="/"
        onClick={onBack}
      >
        <ChevronLeftIcon />
      </Link>
      <h1 className="min-w-0 flex-1 text-lg font-semibold">메모 수정</h1>
      <div className="flex shrink-0 gap-1">
        {children}
      </div>
    </div>
  )
}

function EditorStatus({ children }: PropsWithChildren) {
  return (
    <p
      aria-live="polite"
      className="flex min-h-[var(--notes-editor-status-height)] items-center border-b border-line px-[var(--notes-editor-content-inset)] py-2 text-sm text-soft-ink"
      role="status"
    >
      {children}
    </p>
  )
}

export const NoteDetailLayout = {
  Page: EditorPage,
  Header: EditorHeader,
  Actions: EditorActions,
  Status: EditorStatus,
}
