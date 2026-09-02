import { joinClassNames } from "@/shared/lib/join-class-names"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { CloseIcon } from "@/shared/ui/icons"

type ActionToastProps = {
  actionLabel?: string
  className?: string
  kind?: "error" | "status"
  message: string
  onAction?(): void
  onDismiss(): void
}

export function ActionToast({
  actionLabel,
  className = "",
  kind = "status",
  message,
  onAction,
  onDismiss,
}: ActionToastProps) {
  const toastClassName = joinClassNames(
    "flex items-center gap-3 rounded-panel border bg-surface-raised px-3 py-2.5 text-sm leading-5 shadow-floating",
    kind === "error" ? "border-danger" : "border-line-strong",
    className,
  )

  return (
    <div
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={toastClassName}
      role={kind === "error" ? "alert" : "status"}
    >
      <p className="min-w-0 flex-1">{message}</p>
      {actionLabel && onAction ? (
        <Button onClick={onAction} tone="quiet">
          {actionLabel}
        </Button>
      ) : null}
      <IconButton
        aria-label="알림 닫기"
        onClick={onDismiss}
        size="compact"
      >
        <CloseIcon />
      </IconButton>
    </div>
  )
}
