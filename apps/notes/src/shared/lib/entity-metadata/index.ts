import { z } from "zod"

export const EntityIdSchema = z
  .string()
  .refine((value) => value.trim().length > 0)

export const IsoDateTimeSchema = z.iso.datetime({ offset: true })

const MILLISECOND_DIGITS = 3
const FRACTIONAL_SECONDS = /\.(\d+)(?=Z|[+-])/u

export function toTimestamp(value: string) {
  const instant = IsoDateTimeSchema.parse(value).replace(FRACTIONAL_SECONDS, (_, digits: string) =>
    "." + digits.slice(0, MILLISECOND_DIGITS).padEnd(MILLISECOND_DIGITS, "0"),
  )
  const timestamp = Date.parse(instant)
  if (!Number.isSafeInteger(timestamp)) throw new RangeError("Invalid timestamp")
  return timestamp
}

export const TimestampSchema = z.int().refine((value) => Number.isFinite(new Date(value).getTime()))

export const RevisionSchema = z.number().int().nonnegative().safe()

export type EntityId = z.infer<typeof EntityIdSchema>
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>
