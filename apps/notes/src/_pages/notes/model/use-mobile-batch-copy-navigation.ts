"use client"

import { useRouter } from "next/navigation"
import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"

const confirmationHref = "/batch-copy/?view=current"

export function useMobileBatchCopyNavigation() {
  const router = useRouter()
  const { flush } = useMobileBatchCopy()

  function prefetch() {
    router.prefetch(confirmationHref)
  }

  async function confirm() {
    if (!await flush()) return false
    router.push(confirmationHref)
    return true
  }

  return { confirm, prefetch }
}
