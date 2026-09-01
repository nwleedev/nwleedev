import { describe, expect, it } from "vitest"

import { InteractionPreferencesRecordSchema } from "./interaction-preferences-record"

describe("InteractionPreferencesRecordSchema", () => {
  it("accepts the saved interaction preference", () => {
    expect(
      InteractionPreferencesRecordSchema.safeParse({
        metaClickEnabled: true,
        updatedAt: "2026-08-31T01:00:00.000Z",
      }).success,
    ).toBe(true)
  })

  it("rejects a missing update time", () => {
    expect(
      InteractionPreferencesRecordSchema.safeParse({
        metaClickEnabled: true,
      }).success,
    ).toBe(false)
  })
})
