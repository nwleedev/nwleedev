import type { Asset, Memo, Placement } from "./model/records"

export type { Asset, Memo, Placement } from "./model/records"
export { applyPlacementGeometry, resizeMemo, validatePlacementGeometry, validateSize } from "./model/geometry"
export type { PlacementGeometry, Size } from "./model/geometry"
export { createMemoText } from "./model/memo-text"

export type Project = {
  id: string
  title: string
  updatedAt: number
  revision: number
}

export type ListProjects = () => Promise<readonly Project[]>
export type ReadProject = (id: string) => Promise<Project | undefined>
export type CreateProject = () => Promise<Project>

export type MemoUpdate = {
  memoId: string
  updateId: string
  payload: Uint8Array
}

export type ProjectChange = {
  projectId: string
  revision: number
}

export type ProjectDocument = {
  project: Project
  assets: readonly Asset[]
  placements: readonly Placement[]
  memos: readonly Memo[]
  memoUpdates: readonly MemoUpdate[]
}
