import type { TextUsageReader } from "@/entities/usage"

import { projectUsageRows, type UsageRow } from "./usage-projection"

export type UsageReadState =
  | { status: "failure" }
  | { status: "loading" }
  | { rows: readonly UsageRow[]; status: "ready" }

export async function readUsage(
  reader: TextUsageReader,
): Promise<UsageReadState> {
  try {
    const records = await reader.getAll()
    return { rows: projectUsageRows(records), status: "ready" }
  } catch {
    return { status: "failure" }
  }
}
