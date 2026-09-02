import type { TextUsage } from "@/entities/usage"

export type UsageRow = {
  counts: {
    batchCopy: number
    individualCopy: number
    total: number
  }
  id: string
  note: TextUsage["note"]
  textSnapshot: string
}

export function projectUsageRows(
  records: readonly TextUsage[],
): readonly UsageRow[] {
  return records.map((record) => ({
    counts: {
      ...record.counts,
      total: record.counts.individualCopy + record.counts.batchCopy,
    },
    id: record.id,
    note: record.note,
    textSnapshot: record.textSnapshot,
  }))
}
