"use client"

import {
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type RefObject,
} from "react"

import { Button } from "@/shared/ui/button"
import { PageHeading } from "@/shared/ui/page-heading"

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
  onClose(): void
}

function AccumulatorPanelContent({
  headingRef,
  onClose,
}: AccumulatorPanelContentProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex items-center justify-between gap-4 border-b-2 border-ink px-5 py-4">
        <h2
          className="font-display text-2xl font-semibold tracking-[-0.035em]"
          id={headingRef ? "accumulator-dialog-title" : undefined}
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
        >
          누적 텍스트
        </h2>
        <Button onClick={onClose} tone="quiet">
          닫기
        </Button>
      </header>
      <div className="grid min-h-0 flex-1 place-items-center p-6 text-center">
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
      className="@container/notes-workspace min-h-screen px-4 py-7 sm:px-7 sm:py-10 xl:px-10"
      id="main-content"
      ref={container}
    >
      <PageHeading
        action={
          <Button
            aria-label={`누적 텍스트 ${accumulatorCountText}`}
            aria-controls={
              inline ? (open ? INLINE_PANEL_ID : undefined) : MODAL_PANEL_ID
            }
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            ref={trigger}
            tone="quiet"
          >
            <span>누적 텍스트</span>
            <span
              aria-hidden="true"
              className="inline-flex min-w-9 items-center justify-center rounded-full bg-ink px-2 py-0.5 font-mono text-xs tabular-nums text-canvas"
            >
              {accumulatorCountText}
            </span>
          </Button>
        }
        title="메모"
      />
      <div
        className={`mt-6 min-h-[32rem] gap-6 ${open && inline ? "grid grid-cols-[minmax(0,1fr)_22rem]" : "block"}`}
      >
        <section className="min-w-0" aria-label="메모 작업 영역">
          {children}
        </section>
        {open && inline ? (
          <aside
            className="min-h-[32rem] overflow-hidden rounded-panel border-2 border-ink shadow-note"
            id={INLINE_PANEL_ID}
          >
            <AccumulatorPanelContent onClose={closePanel} />
          </aside>
        ) : null}
      </div>
      <dialog
        aria-labelledby="accumulator-dialog-title"
        className="m-auto h-[min(42rem,calc(100dvh-2rem))] w-[min(32rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-panel border-2 border-ink bg-surface p-0 text-ink shadow-floating"
        id={MODAL_PANEL_ID}
        onClose={handleDialogClose}
        ref={dialog}
      >
        <AccumulatorPanelContent
          headingRef={dialogHeading}
          onClose={closePanel}
        />
      </dialog>
    </main>
  )
}
