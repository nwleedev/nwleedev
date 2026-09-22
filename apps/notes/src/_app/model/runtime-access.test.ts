import { describe, expect, it } from "vitest"

import { isSupportedRuntimeAddress } from "./runtime-access"

describe("isSupportedRuntimeAddress", () => {
  it.each([
    {
      address: {
        hostname: "notes.example.com",
        protocol: "https:",
        secureContext: true,
      },
      supported: true,
    },
    {
      address: {
        hostname: "localhost",
        protocol: "http:",
        secureContext: true,
      },
      supported: true,
    },
    {
      address: {
        hostname: "notes.example.com",
        protocol: "https:",
        secureContext: false,
      },
      supported: false,
    },
    {
      address: {
        hostname: "127.0.0.1",
        protocol: "http:",
        secureContext: true,
      },
      supported: false,
    },
    {
      address: {
        hostname: "",
        protocol: "file:",
        secureContext: true,
      },
      supported: false,
    },
  ])(
    "returns $supported for $address.protocol//$address.hostname",
    ({ address, supported }) => {
      expect(isSupportedRuntimeAddress(address)).toBe(supported)
    },
  )
})
