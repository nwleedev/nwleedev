"use client"

import { useSyncExternalStore, type PropsWithChildren } from "react"

import { isSupportedRuntimeAddress } from "../model/runtime-access"

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
      className="grid min-h-dvh place-items-center bg-canvas px-4 py-10 text-ink"
      id="main-content"
    >
      {access === "checking" ? (
        <p className="text-sm text-soft-ink" role="status">
          접속 주소 확인 중
        </p>
      ) : (
        <section className="w-full max-w-xl px-2 py-4 sm:px-4">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
            잘못된 접근입니다.
          </h1>
          <p className="mt-4 text-sm leading-6 text-soft-ink sm:text-base">
            HTTPS 주소 또는 <code>http://localhost</code> 주소로 다시
            접속하세요.
          </p>
        </section>
      )}
    </main>
  )
}
