import type { ReactNode } from "react"

import { DesktopNavigation } from "@/widgets/application-navigation"

type TaskPageFrameProps = {
  children: ReactNode
  pathname: string
}

export function TaskPageFrame({ children, pathname }: TaskPageFrameProps) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <DesktopNavigation pathname={pathname} />
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  )
}
