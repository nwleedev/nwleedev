import { describe, expect, it } from "vitest"

import { InteractionPreferencesRecordSchema } from "./interaction-preferences-record"

describe("InteractionPreferencesRecordSchema", () => {
  it("reads a preference saved before direct move controls as disabled", () => {
    const savedPreference = {
      batchCopyShortcutEnabled: true,
      updatedAt: new Date().toISOString(),
    }

    expect(InteractionPreferencesRecordSchema.parse(savedPreference)).toEqual({
      ...savedPreference,
      batchCopyReorderButtonsEnabled: false,
    })
  })

  it("rejects a missing update time", () => {
    expect(
      InteractionPreferencesRecordSchema.safeParse({
        batchCopyShortcutEnabled: true,
      }).success,
    ).toBe(false)
  })
})
