export type Project = {
  id: string
  title: string
  updatedAt: string
  revision: number
}

export type ListProjects = () => Promise<readonly Project[]>
export type ReadProject = (id: string) => Promise<Project | undefined>
export type CreateProject = () => Promise<Project>

export type Asset = {
  id: string
  projectId: string
  mimeType: string
  originalWidth: number
  originalHeight: number
  original: Blob
}

export type Placement = {
  id: string
  projectId: string
  assetId: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  quality: number
}

export type Memo = {
  id: string
  placementId: string
  side: "top" | "right" | "bottom" | "left"
  width: number
  height: number
}

export type ProjectDocument = {
  project: Project
  assets: readonly Asset[]
  placements: readonly Placement[]
  memos: readonly Memo[]
}
