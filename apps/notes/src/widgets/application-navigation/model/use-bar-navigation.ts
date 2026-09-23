"use client"

import { useRouter } from "next/navigation"

import { useNavigationGuard } from "@/features/navigation-guard"

export function useBarNavigation() {
  const router = useRouter()
  const { requestNavigation } = useNavigationGuard()

  function navigate(href: string, event: { preventDefault(): void }) {
    if (requestNavigation(() => router.push(href))) {
      event.preventDefault()
    }
  }

  return navigate
}
