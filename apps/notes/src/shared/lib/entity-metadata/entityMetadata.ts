import { z } from "zod"

export const EntityIdSchema = z
  .string()
  .refine((value) => value.trim().length > 0)

export const IsoDateTimeSchema = z.iso.datetime({ offset: true })

export const RevisionSchema = z.number().int().nonnegative().safe()

export type EntityId = z.infer<typeof EntityIdSchema>
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>
export type Revision = z.infer<typeof RevisionSchema>
