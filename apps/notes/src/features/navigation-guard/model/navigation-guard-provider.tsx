"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type PropsWithChildren,
} from "react"

export type NavigationContinuation = () => void
export type NavigationGuard = (
  continueNavigation: NavigationContinuation,
) => boolean

type NavigationGuardContextValue = {
  registerNavigationGuard(guard: NavigationGuard): () => void
  requestNavigation(continueNavigation: NavigationContinuation): boolean
}

const NavigationGuardContext =
  createContext<NavigationGuardContextValue | null>(null)

export function NavigationGuardProvider({
  children,
}: PropsWithChildren) {
  const guardReference = useRef<NavigationGuard | null>(null)

  const registerNavigationGuard = useCallback((guard: NavigationGuard) => {
    guardReference.current = guard

    return () => {
      if (guardReference.current === guard) {
        guardReference.current = null
      }
    }
  }, [])

  const requestNavigation = useCallback((
    continueNavigation: NavigationContinuation,
  ) => guardReference.current?.(continueNavigation) ?? false, [])

  const value = useMemo(
    () => ({ registerNavigationGuard, requestNavigation }),
    [registerNavigationGuard, requestNavigation],
  )

  return (
    <NavigationGuardContext value={value}>
      {children}
    </NavigationGuardContext>
  )
}

export function useNavigationGuard() {
  const context = useContext(NavigationGuardContext)

  if (context === null) {
    throw new Error(
      "useNavigationGuard must be used within NavigationGuardProvider",
    )
  }

  return context
}
