import { PageHeading } from "@/shared/ui/page-heading"

const usageMetrics = [
  { description: "메모를 바로 복사한 횟수", label: "일반 복사" },
  { description: "누적 목록에 더한 횟수", label: "누적" },
  { description: "두 횟수를 합한 값", label: "합계" },
] as const

export function UsageStartPage() {
  return (
    <main
      className="min-h-screen px-4 py-5 sm:px-6 sm:py-7 xl:px-8"
      id="main-content"
    >
      <PageHeading density="compact" title="사용 빈도" />
      <section
        aria-labelledby="usage-metrics-heading"
        className="mt-5 overflow-hidden rounded-panel border border-line bg-surface-raised shadow-note"
      >
        <h2 className="sr-only" id="usage-metrics-heading">
          복사 횟수 기준
        </h2>
        <dl className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {usageMetrics.map((metric) => (
            <div className="px-5 py-4" key={metric.label}>
              <dt className="text-xs font-semibold tracking-[0.04em] text-soft-ink">
                {metric.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {metric.description}
              </dd>
            </div>
          ))}
        </dl>
        <p
          aria-live="polite"
          className="border-t border-line px-5 py-12 text-center text-sm text-soft-ink"
          role="status"
        >
          복사 기록이 없습니다.
        </p>
      </section>
    </main>
  )
}
