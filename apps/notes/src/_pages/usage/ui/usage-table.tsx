import type { UsageRow } from "../model/usage-projection"

type UsageCountCellProps = {
  count: number
  emphasis?: boolean
  label: string
}

function UsageCountCell({
  count,
  emphasis = false,
  label,
}: UsageCountCellProps) {
  const countText = `${count.toLocaleString("ko-KR")}회`
  const countClassName = emphasis
    ? "text-base font-bold tabular-nums text-ink"
    : "text-base font-semibold tabular-nums text-ink"

  return (
    <td className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 px-4 py-2 sm:table-cell sm:px-5 sm:py-4 sm:text-right">
      <span className="text-xs font-semibold text-soft-ink sm:hidden">
        {label}
      </span>
      <span className={countClassName}>{countText}</span>
    </td>
  )
}

type UsageTableRowProps = {
  row: UsageRow
}

function UsageTableRow({ row }: UsageTableRowProps) {
  const revisionText = row.note.contentRevision.toLocaleString("ko-KR")

  return (
    <tr className="grid py-2 sm:table-row sm:py-0">
      <th
        className="block px-4 py-3 text-left font-normal sm:table-cell sm:px-5 sm:py-4"
        scope="row"
      >
        <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6 text-ink">
          {row.textSnapshot || "빈 메모"}
        </p>
        <p className="mt-1 break-all text-xs text-soft-ink">
          메모 {row.note.id}, 원문 버전 {revisionText}
        </p>
      </th>
      <UsageCountCell
        count={row.counts.individualCopy}
        label="개별 복사"
      />
      <UsageCountCell count={row.counts.batchCopy} label="일괄 복사" />
      <UsageCountCell count={row.counts.total} emphasis label="합계" />
    </tr>
  )
}

type UsageTableProps = {
  rows: readonly UsageRow[]
}

export function UsageTable({ rows }: UsageTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="block w-full table-fixed sm:table">
        <caption className="sr-only">
          메모 원문별 개별 복사, 일괄 복사와 합계
        </caption>
        <thead className="hidden border-b border-line bg-canvas sm:table-header-group">
          <tr>
            <th className="w-[55%] px-5 py-3 text-left text-xs font-semibold text-soft-ink" scope="col">
              메모 원문
            </th>
            <th className="w-[15%] px-5 py-3 text-right text-xs font-semibold text-soft-ink" scope="col">
              개별 복사
            </th>
            <th className="w-[15%] px-5 py-3 text-right text-xs font-semibold text-soft-ink" scope="col">
              일괄 복사
            </th>
            <th className="w-[15%] px-5 py-3 text-right text-xs font-semibold text-soft-ink" scope="col">
              합계
            </th>
          </tr>
        </thead>
        <tbody className="block divide-y divide-line sm:table-row-group">
          {rows.map((row) => (
            <UsageTableRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
