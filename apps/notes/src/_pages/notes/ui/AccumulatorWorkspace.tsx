"use client"

import {
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type RefObject,
} from "react"

import { Button } from "@/shared/ui/button"
import { joinClassNames } from "@/shared/lib/join-class-names"

const INLINE_PANEL_THRESHOLD_REM = 72
const INLINE_PANEL_ID = "accumulator-panel"
const MODAL_PANEL_ID = "accumulator-dialog"

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
  headingRef?: RefObject<HTMLHeadingElement | null>
  presentation: "inline" | "modal"
  onClose(): void
}

function AccumulatorPanelContent({
  headingRef,
  onClose,
  presentation,
}: AccumulatorPanelContentProps) {
  const emptyContentClassName = joinClassNames(
    "grid min-h-0 flex-1 place-items-center p-6 text-center",
    presentation === "inline" ? "pt-16" : undefined,
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-raised">
      {presentation === "modal" ? (
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2
            className="font-display text-lg font-semibold tracking-[-0.02em]"
            id="accumulator-dialog-title"
            ref={headingRef}
            tabIndex={-1}
          >
            누적 텍스트
          </h2>
          <Button onClick={onClose} tone="quiet">
            닫기
          </Button>
        </header>
      ) : null}
      <div className={emptyContentClassName}>
        <p className="text-sm leading-6 text-soft-ink">
          누적한 텍스트가 없습니다.
        </p>
      </div>
    </div>
  )
}

export function AccumulatorWorkspace({ children }: PropsWithChildren) {
  const accumulatorCount = 0
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

  function handleDialogClose() {
    if (switchingToInline.current) {
      switchingToInline.current = false
      return
    }

    setOpen(false)
    trigger.current?.focus()
  }

  return (
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
              onClose={closePanel}
              presentation="inline"
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
          headingRef={dialogHeading}
          onClose={closePanel}
          presentation="modal"
        />
      </dialog>
    </main>
  )
}
