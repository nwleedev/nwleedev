import { z } from "zod"

import { IsoDateTimeSchema } from "@/shared/lib/entity-metadata"

export const InteractionPreferencesRecordSchema = z
  .object({
    batchCopyReorderButtonsEnabled: z.boolean().default(false),
    batchCopyShortcutEnabled: z.boolean(),
    updatedAt: IsoDateTimeSchema,
  })
  .strict()

export type InteractionPreferences = z.infer<
  typeof InteractionPreferencesRecordSchema
>

export interface InteractionPreferencesRepository {
  get(): Promise<InteractionPreferences | null>
  save(
    preferences: InteractionPreferences,
  ): Promise<InteractionPreferences>
}

export function parseInteractionPreferencesRecord(
  value: unknown,
): InteractionPreferences {
  return InteractionPreferencesRecordSchema.parse(value)
}
