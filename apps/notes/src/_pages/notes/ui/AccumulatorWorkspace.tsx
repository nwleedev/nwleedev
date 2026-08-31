"use client"

import Link from "next/link"
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type RefObject,
} from "react"

import type { AccumulatedTextItem } from "@/entities/accumulator"
import { useAccumulator } from "@/features/accumulate-note"
import { Button } from "@/shared/ui/button"
import { joinClassNames } from "@/shared/lib/join-class-names"

const INLINE_PANEL_THRESHOLD_REM = 72
const INLINE_PANEL_ID = "accumulator-panel"
const MODAL_PANEL_ID = "accumulator-dialog"

type AccumulatorWorkspaceContextValue = {
  revealNewAccumulation(): void
}

const AccumulatorWorkspaceContext =
  createContext<AccumulatorWorkspaceContextValue | null>(null)

export function useAccumulatorWorkspace() {
  const context = useContext(AccumulatorWorkspaceContext)

  if (context === null) {
    throw new Error(
      "useAccumulatorWorkspace must be used within AccumulatorWorkspace",
    )
  }

  return context
}

function canUseInlinePanel(element: HTMLElement | null) {
  if (element === null) {
    return false
  }

  const rootFontSize = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  )

  return element.clientWidth >= INLINE_PANEL_THRESHOLD_REM * rootFontSize
}

function useInlinePanel(container: RefObject<HTMLElement | null>) {
  const [inline, setInline] = useState(false)

  useEffect(() => {
    const element = container.current

    if (element === null || typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(() => {
      setInline(canUseInlinePanel(element))
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [container])

  return inline
}

type AccumulatorPanelContentProps = {
  headingId: string
  headingRef?: RefObject<HTMLHeadingElement | null>
  items: readonly AccumulatedTextItem[]
  presentation: "inline" | "modal"
  status: "failure" | "loading" | "ready"
  onClose(): void
  onRetry(): void
}

function AccumulatorItems({ items }: { items: readonly AccumulatedTextItem[] }) {
  return (
    <ol className="grid gap-2 p-4">
      {items.map((item, index) => {
        const indexText = (index + 1).toLocaleString("ko-KR")
        const itemText = item.textSnapshot || "빈 메모"

        return (
          <li
            className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-control border border-line bg-surface p-3"
            key={item.id}
          >
            <span className="text-xs font-semibold tabular-nums text-soft-ink">
              {indexText}
            </span>
            <p className="whitespace-pre-wrap break-words text-sm leading-6">
              {itemText}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

type EmptyAccumulatorContentProps = {
  className: string
  status: "failure" | "loading" | "ready"
  onRetry(): void
}

function EmptyAccumulatorContent({
  className,
  onRetry,
  status,
}: EmptyAccumulatorContentProps) {
  if (status === "failure") {
    return (
      <div className={className}>
        <div className="grid justify-items-center gap-3">
          <p className="text-sm leading-6 text-danger">
            누적 텍스트를 불러오지 못했습니다.
          </p>
          <Button onClick={onRetry} tone="quiet">
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  const message =
    status === "loading"
      ? "누적 텍스트 불러오는 중"
      : "누적한 텍스트가 없습니다."

  return (
    <div className={className}>
      <p className="text-sm leading-6 text-soft-ink">{message}</p>
    </div>
  )
}

function AccumulatorPanelContent({
  headingId,
  headingRef,
  items,
  onClose,
  onRetry,
  presentation,
  status,
}: AccumulatorPanelContentProps) {
  const emptyContentClassName = joinClassNames(
    "grid min-h-0 flex-1 place-items-center p-6 text-center",
    presentation === "inline" ? "pt-16" : undefined,
  )
  const hasItems = items.length > 0

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-raised">
      <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <h2
          className="font-display text-lg font-semibold tracking-[-0.02em]"
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
        >
          누적 텍스트
        </h2>
        <Button onClick={onClose} tone="quiet">
          닫기
        </Button>
      </header>
      {hasItems ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <AccumulatorItems items={items} />
        </div>
      ) : (
        <EmptyAccumulatorContent
          className={emptyContentClassName}
          onRetry={onRetry}
          status={status}
        />
      )}
    </div>
  )
}

export function AccumulatorWorkspace({ children }: PropsWithChildren) {
  const accumulator = useAccumulator()
  const accumulatorItems =
    accumulator.status === "ready" ? accumulator.items : []
  const accumulatorCount = accumulatorItems.length
  const accumulatorCountText = `${accumulatorCount.toLocaleString("ko-KR")}개`
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const dialogHeading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const switchingToInline = useRef(false)
  const inline = useInlinePanel(container)
  const showInlinePanel = open && inline
  const workspaceLayoutClassName = joinClassNames(
    "h-full min-h-0",
    showInlinePanel ? "grid grid-cols-[minmax(0,1fr)_22rem]" : "block",
  )
  let controlledPanelId: string | undefined = MODAL_PANEL_ID

  if (inline) {
    controlledPanelId = showInlinePanel ? INLINE_PANEL_ID : undefined
  }

  useEffect(() => {
    const element = dialog.current

    if (element === null) {
      return
    }

    if (open && !inline && !element.open) {
      element.showModal()
      dialogHeading.current?.focus()
      return
    }

    if (element.open && (!open || inline)) {
      switchingToInline.current = open && inline
      element.close()
    }
  }, [inline, open])

  function closePanel() {
    setOpen(false)
  }

  function revealNewAccumulation() {
    if (inline && accumulatorCount === 0) {
      setOpen(true)
    }
  }

  function handleDialogClose() {
    if (switchingToInline.current) {
      switchingToInline.current = false
      return
    }

    setOpen(false)
    trigger.current?.focus()
  }

  return (
    <AccumulatorWorkspaceContext value={{ revealNewAccumulation }}>
      <main
        className="@container/notes-workspace relative h-full min-h-0 overflow-hidden"
        id="main-content"
        ref={container}
      >
        <Button
          aria-label={`누적 텍스트 ${accumulatorCountText}`}
          aria-controls={controlledPanelId}
          aria-expanded={open}
          className="absolute right-3 top-3 z-20 hidden shadow-floating @3xl/notes-workspace:inline-flex sm:right-4"
          onClick={() => setOpen((current) => !current)}
          ref={trigger}
          tone="quiet"
        >
          <span>누적 텍스트</span>
          <span
            aria-hidden="true"
            className="inline-flex min-w-8 items-center justify-center rounded-full bg-rail px-2 py-0.5 text-xs font-semibold tabular-nums text-rail-ink"
          >
            {accumulatorCountText}
          </span>
        </Button>
        {accumulatorCount > 0 ? (
          <Link
            aria-label={`누적 텍스트 ${accumulatorCountText} 관리`}
            className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-30 inline-flex min-h-12 items-center gap-2 rounded-full border border-action bg-action px-4 py-2 text-sm font-semibold text-action-ink shadow-floating @3xl/notes-workspace:hidden"
            href="/accumulator/"
          >
            <span>누적 텍스트</span>
            <span
              aria-hidden="true"
              className="min-w-6 text-center tabular-nums"
            >
              {accumulatorCountText}
            </span>
          </Link>
        ) : null}
        <div className={workspaceLayoutClassName}>
          <section
            className="h-full min-h-0 min-w-0 overflow-hidden"
            aria-label="메모 작업 영역"
          >
            {children}
          </section>
          {showInlinePanel ? (
            <aside
              aria-label="누적 텍스트"
              className="h-full min-h-0 overflow-hidden border-l border-line bg-surface-raised shadow-floating"
              id={INLINE_PANEL_ID}
            >
              <AccumulatorPanelContent
                headingId="accumulator-inline-title"
                items={accumulatorItems}
                onClose={closePanel}
                onRetry={accumulator.retry}
                presentation="inline"
                status={accumulator.status}
              />
            </aside>
          ) : null}
        </div>
        <dialog
          aria-labelledby="accumulator-dialog-title"
          className="m-auto h-[min(42rem,calc(100dvh-2rem))] w-[min(32rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-panel border border-line bg-surface-raised p-0 text-ink shadow-floating"
          id={MODAL_PANEL_ID}
          onClose={handleDialogClose}
          ref={dialog}
        >
          <AccumulatorPanelContent
            headingId="accumulator-dialog-title"
            headingRef={dialogHeading}
            items={accumulatorItems}
            onClose={closePanel}
            onRetry={accumulator.retry}
            presentation="modal"
            status={accumulator.status}
          />
        </dialog>
      </main>
    </AccumulatorWorkspaceContext>
  )
}
