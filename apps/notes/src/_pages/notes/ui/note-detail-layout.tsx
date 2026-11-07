import Link from "next/link"
import type { ComponentProps, PropsWithChildren } from "react"

import { ChevronLeftIcon } from "@/shared/ui/icons"

export const backLinkClassName =
  "inline-flex h-[var(--notes-touch-target)] w-[var(--notes-touch-target)] items-center justify-center rounded-control text-icon hover:bg-canvas hover:text-text active:translate-y-px"

export const editorClassName = "h-full min-h-0 w-full resize-none border-0 bg-surface-raised px-4 py-5 text-base leading-7 outline-none"

function EditorPage({ children }: PropsWithChildren) {
  return (
    <main
      className="max-md:@container/editor relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-surface-raised"
      id="main-content"
    >
      {children}
    </main>
  )
}

function EditorHeader({ children }: PropsWithChildren) {
  return (
    <header className="grid min-w-0 gap-2 border-b border-line bg-surface-raised px-3 py-2 max-md:min-h-[var(--notes-mobile-page-header-height)] max-md:@min-[18rem]/editor:grid-cols-[auto_minmax(0,1fr)_auto] max-md:@min-[18rem]/editor:items-center max-md:@min-[18rem]/editor:gap-x-3 max-md:@min-[18rem]/editor:gap-y-0 max-md:@min-[18rem]/editor:py-1">
      {children}
    </header>
  )
}

function EditorActions({ children, onBack }: PropsWithChildren<{ onBack?: ComponentProps<typeof Link>["onClick"] }>) {
  return (
    <div className="flex min-w-0 items-center gap-3 max-md:@min-[18rem]/editor:contents max-md:@min-[18rem]/editor:[&>a]:row-span-2">
      <Link
        aria-label="메모 목록"
        className={backLinkClassName}
        href="/"
        onClick={onBack}
      >
        <ChevronLeftIcon />
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold max-md:@min-[18rem]/editor:self-end">메모 수정</h1>
      <div className="flex shrink-0 gap-1 max-md:@min-[18rem]/editor:col-start-3 max-md:@min-[18rem]/editor:row-span-2 max-md:@min-[18rem]/editor:row-start-1">
        {children}
      </div>
    </div>
  )
}

function EditorStatus({ children }: PropsWithChildren) {
  return (
    <p
      aria-live="polite"
      className="px-1 pb-1 text-sm text-soft-ink max-md:@min-[18rem]/editor:col-start-2 max-md:@min-[18rem]/editor:row-start-2 max-md:@min-[18rem]/editor:self-start max-md:@min-[18rem]/editor:p-0"
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
