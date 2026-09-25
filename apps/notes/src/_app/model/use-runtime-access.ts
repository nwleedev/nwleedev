import { useSyncExternalStore } from "react"

import { isSupportedRuntimeAddress } from "./runtime-access"

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

export function useRuntimeAccess() {
  return useSyncExternalStore(
    subscribeToRuntimeAddress,
    readRuntimeAccess,
    readServerRuntimeAccess,
  )
}
