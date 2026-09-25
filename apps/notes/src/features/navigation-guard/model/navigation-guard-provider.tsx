"use client"

import type { PropsWithChildren } from "react"

import {
  NavigationGuardContext,
  useNavigationGuardState,
} from "./use-guard"

export function NavigationGuardProvider({ children }: PropsWithChildren) {
  const value = useNavigationGuardState()

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
