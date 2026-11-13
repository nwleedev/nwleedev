import { useEffect, useEffectEvent } from "react"
import { useRevalidator } from "react-router"

import type { ProjectChange } from "@/entities/project"

type Subscribe = (listener: (change: ProjectChange) => void) => () => void

export function useProjectRevalidation(subscribe: Subscribe, isNewer: (change: ProjectChange) => boolean) {
  const { revalidate } = useRevalidator()
  const receive = useEffectEvent((change: ProjectChange) => {
    if (isNewer(change)) {
      void revalidate()
    }
  })

  useEffect(() => {
    function refreshVisible() {
      if (document.visibilityState === "visible") void revalidate()
    }

    const unsubscribe = subscribe((change) => receive(change))
    document.addEventListener("visibilitychange", refreshVisible)
    refreshVisible()

    return () => {
      unsubscribe()
      document.removeEventListener("visibilitychange", refreshVisible)
    }
  }, [revalidate, subscribe])
}
