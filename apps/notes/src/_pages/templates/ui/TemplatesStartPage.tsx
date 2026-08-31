import { PageHeading } from "@/shared/ui/page-heading"

export function TemplatesStartPage() {
  return (
    <main
      className="min-h-screen px-4 py-5 sm:px-6 sm:py-7 xl:px-8"
      id="main-content"
    >
      <PageHeading density="compact" title="템플릿" />
      <section className="mt-5 grid min-h-[32rem] place-items-center rounded-panel border border-line bg-surface-raised p-6 shadow-note">
        <p className="text-sm text-soft-ink">템플릿이 없습니다.</p>
      </section>
    </main>
  )
}
