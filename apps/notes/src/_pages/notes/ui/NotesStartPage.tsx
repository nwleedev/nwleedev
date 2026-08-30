import Link from "next/link"

export function NotesStartPage() {
  return (
    <main className="min-h-screen bg-canvas px-5 py-10 text-ink sm:px-10 sm:py-16">
      <section className="mx-auto max-w-3xl rounded-paper border border-line bg-paper p-7 shadow-paper sm:p-11">
        <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
          메모
        </h1>
        <p className="mt-5 text-base leading-7 text-soft-ink sm:text-lg">
          메모가 없습니다.
        </p>
        <Link
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-control bg-action px-5 py-2.5 font-semibold text-white transition-colors hover:bg-action-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--notes-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          href="/analysis/"
        >
          텍스트 분석
        </Link>
      </section>
    </main>
  )
}
