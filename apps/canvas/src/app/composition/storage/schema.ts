import type { DBSchema } from "idb"

import type { Asset, Memo, MemoUpdate, Placement, Project } from "@/entities/project"

export interface Schema extends DBSchema {
  projects: { key: string; value: Project; indexes: { updatedAt: number } }
  assets: { key: [string, string]; value: Asset }
  placements: {
    key: string
    value: Placement
    indexes: { projectOrder: [string, number]; asset: [string, string] }
  }
  memos: { key: string; value: Memo; indexes: { placement: string } }
  memoUpdates: { key: [string, string]; value: MemoUpdate }
}
