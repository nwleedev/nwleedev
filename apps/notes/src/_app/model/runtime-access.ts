export type RuntimeAddress = {
  hostname: string
  protocol: string
  secureContext: boolean
}

export function isSupportedRuntimeAddress({
  hostname,
  protocol,
  secureContext,
}: RuntimeAddress) {
  if (!secureContext) {
    return false
  }

  return protocol === "https:" || (protocol === "http:" && hostname === "localhost")
}
