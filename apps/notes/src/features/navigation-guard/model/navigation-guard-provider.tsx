"use client"

import type { PropsWithChildren } from "react"
import { useBrowserNavigation } from "./use-browser-navigation"

import {
  NavigationGuardContext,
  useNavigationGuardState,
} from "./use-guard"

export function NavigationGuardProvider({ children }: PropsWithChildren) {
  const value = useNavigationGuardState()
  useBrowserNavigation(value.requestNavigation)

  return (
    <NavigationGuardContext value={value}>
      {children}
    </NavigationGuardContext>
  )
}

export { useNavigationGuard } from "./use-guard"
export type {
  NavigationContinuation,
  NavigationGuard,
} from "./use-guard"
