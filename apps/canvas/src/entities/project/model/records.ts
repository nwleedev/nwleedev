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
