import { useEffect, useEffectEvent } from "react"
import { useRevalidator } from "react-router"

import type { Project, ProjectChange } from "@/entities/project"

type Subscribe = (listener: (change: ProjectChange) => void) => () => void

export function useProjectRevalidation(project: Project, subscribe: Subscribe) {
  const { revalidate } = useRevalidator()
  const projectId = project.id
  const receive = useEffectEvent((change: ProjectChange) => {
    if (change.projectId === project.id && change.revision > project.revision) {
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
  }, [projectId, revalidate, subscribe])
}
