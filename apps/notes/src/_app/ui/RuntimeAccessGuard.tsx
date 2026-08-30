"use client"

import { useSyncExternalStore, type PropsWithChildren } from "react"

import { StatusNotice } from "@/shared/ui/status-notice"

import { isSupportedRuntimeAddress } from "../model/runtimeAccess"

type RuntimeAccess = "checking" | "supported" | "unsupported"

function subscribeToRuntimeAddress() {
  return () => undefined
}

function readRuntimeAccess(): RuntimeAccess {
  return isSupportedRuntimeAddress({
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    secureContext: window.isSecureContext,
  })
    ? "supported"
    : "unsupported"
}

function readServerRuntimeAccess(): RuntimeAccess {
  return "checking"
}

export function RuntimeAccessGuard({ children }: PropsWithChildren) {
  const access = useSyncExternalStore(
    subscribeToRuntimeAddress,
    readRuntimeAccess,
    readServerRuntimeAccess,
  )

  if (access === "supported") {
    return children
  }

  return (
    <main
      aria-busy={access === "checking"}
      className="grid min-h-screen place-items-center bg-canvas px-4 py-10 text-ink"
      id="main-content"
    >
      <section className="w-full max-w-xl rounded-panel border-2 border-ink bg-surface p-6 shadow-note sm:p-8">
        {access === "checking" ? (
          <StatusNotice>접속 주소 확인 중</StatusNotice>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              지원하지 않는 접속 주소
            </h1>
            <p className="mt-4 text-sm leading-6 text-soft-ink sm:text-base">
              HTTPS 주소 또는 <code>http://localhost</code> 주소로 다시
              접속하세요.
            </p>
          </>
        )}
      </section>
    </main>
  )
}
