import Link from "next/link"

import { Button } from "@/shared/ui/button"

const navigationClassName =
  "inline-flex min-h-[var(--notes-control-size)] items-center justify-center rounded-control border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink transition-colors duration-[var(--notes-motion-fast)] hover:border-line-strong hover:bg-canvas"

export function AccumulatorStartPage() {
  return (
    <main
      className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-canvas"
      id="main-content"
    >
      <header className="flex items-center gap-4 border-b border-line bg-surface-raised px-4 py-3 sm:px-5">
        <Link className={navigationClassName} href="/">
          메모로 돌아가기
        </Link>
        <h1 className="font-display text-lg font-semibold tracking-[-0.02em]">
          누적 텍스트
        </h1>
      </header>
      <section
        aria-labelledby="accumulator-empty-title"
        className="grid min-h-0 place-items-center overflow-auto px-4 py-8"
      >
        <div className="max-w-sm text-center">
          <h2
            className="text-base font-semibold"
            id="accumulator-empty-title"
          >
            누적한 텍스트가 없습니다.
          </h2>
        </div>
      </section>
      <footer className="flex items-center justify-end gap-3 border-t border-line bg-surface-raised px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        <Link className={navigationClassName} href="/">
          취소
        </Link>
        <Button disabled>복사</Button>
      </footer>
    </main>
  )
}
