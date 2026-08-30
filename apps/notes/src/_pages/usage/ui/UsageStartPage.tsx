import { PageHeading } from "@/shared/ui/page-heading"

export function UsageStartPage() {
  return (
    <main
      className="min-h-screen px-4 py-7 sm:px-7 sm:py-10 xl:px-10"
      id="main-content"
    >
      <PageHeading title="사용 빈도" />
      <div className="mt-6 overflow-x-auto border-y-2 border-ink bg-surface">
        <table className="w-full min-w-[42rem] border-collapse text-left">
          <thead className="border-b border-line-strong font-mono text-xs tracking-[0.08em] text-soft-ink">
            <tr>
              <th className="px-5 py-4 font-medium" scope="col">
                텍스트
              </th>
              <th className="w-28 px-5 py-4 text-right font-medium" scope="col">
                일반 복사
              </th>
              <th className="w-24 px-5 py-4 text-right font-medium" scope="col">
                누적
              </th>
              <th className="w-24 px-5 py-4 text-right font-medium" scope="col">
                합계
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-5 py-12 text-center text-sm text-soft-ink" colSpan={4}>
                복사 기록이 없습니다.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  )
}
