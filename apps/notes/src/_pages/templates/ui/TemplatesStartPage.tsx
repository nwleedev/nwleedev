import { PageHeading } from "@/shared/ui/page-heading"

export function TemplatesStartPage() {
  return (
    <main
      className="min-h-screen px-4 py-7 sm:px-7 sm:py-10 xl:px-10"
      id="main-content"
    >
      <PageHeading density="compact" title="템플릿" />
      <section className="mt-6 grid min-h-[32rem] place-items-center border border-line bg-surface p-6">
        <p className="text-sm text-soft-ink">템플릿이 없습니다.</p>
      </section>
    </main>
  )
}
