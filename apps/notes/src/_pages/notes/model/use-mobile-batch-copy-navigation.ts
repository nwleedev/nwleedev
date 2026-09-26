import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"

export function useMobileBatchCopyNavigation() {
  const { draft, resumeCollection, ...batchCopy } = useMobileBatchCopy()
  const pathname = usePathname()
  const router = useRouter()
  const [leavingCollection, setLeavingCollection] = useState(false)
  const [observedPathname, setObservedPathname] = useState(pathname)
  const [transition, setTransition] = useState<"idle" | "saving" | "navigating">("idle")
  const resumedSession = useRef<string | null>(null)

  if (observedPathname !== pathname) {
    setObservedPathname(pathname)

    if (pathname === "/") {
      setLeavingCollection(false)
      setTransition("idle")
    }
  }

  useEffect(() => {
    if (pathname !== "/") {
      return
    }

    if (draft?.step !== "confirming") {
      resumedSession.current = null
      return
    }

    if (!leavingCollection && resumedSession.current !== draft.id) {
      resumedSession.current = draft.id
      void resumeCollection()
    }
  }, [
    draft,
    leavingCollection,
    pathname,
    resumeCollection,
  ])

  async function confirm() {
    if (transition === "navigating") {
      router.push("/batch-copy/")
      return true
    }

    if (transition === "saving") {
      return false
    }

    setTransition("saving")
    setLeavingCollection(true)
    const result = await batchCopy.confirm()

    if (!result) {
      setTransition("idle")
      setLeavingCollection(false)
      return false
    }

    setTransition("navigating")
    router.push("/batch-copy/")
    return true
  }

  const restoringCollection =
    pathname === "/" && draft?.step === "confirming" && !leavingCollection

  return { confirm, leavingCollection, restoringCollection }
}
