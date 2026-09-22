export type WorkspaceNoticeInput = {
  actionLabel?: string
  expiresAtMs?: number
  kind?: "error" | "status"
  message: string
  onAction?(): void
  onDismiss?(): void
  replacement?: "dismiss" | "preserve"
}

export type WorkspaceNotice = Omit<WorkspaceNoticeInput, "expiresAtMs"> & {
  expiresAtMs: number
  revision: number
}
