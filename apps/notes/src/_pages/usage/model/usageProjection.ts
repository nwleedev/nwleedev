import type { TextUsage } from "@/entities/usage"

export type UsageRow = {
  counts: {
    accumulation: number
    ordinaryCopy: number
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
      total: record.counts.ordinaryCopy + record.counts.accumulation,
    },
    id: record.id,
    note: record.note,
    textSnapshot: record.textSnapshot,
  }))
}
