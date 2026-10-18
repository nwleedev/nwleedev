import { z } from "zod"

import { EntityIdSchema, RevisionSchema } from "@/shared/lib/entity-metadata"

export const MobileNoteOrderSchema = z.object({
  ids: z.array(EntityIdSchema),
  revision: RevisionSchema,
}).strict()

export type MobileNoteOrder = z.infer<typeof MobileNoteOrderSchema>
export type MobileNotePosition = {
  nextId: string | null
  previousId: string | null
}
export type MoveMobileNoteInput = {
  expectedRevision: number
  noteId: string
  targetIndex: number
}
export type MoveMobileNoteResult = {
  order: MobileNoteOrder
  status: "conflict" | "saved"
}

export function reconcileMobileNoteIds(
  ids: readonly string[],
  availableIds: readonly string[],
) {
  const available = new Set(availableIds)
  const ordered = new Set(ids.filter((id) => available.has(id)))
  for (const id of availableIds) ordered.add(id)
  return [...ordered]
}

export function mobileNotePosition(ids: readonly string[], noteId: string): MobileNotePosition {
  const index = ids.indexOf(noteId)
  if (index < 0) return { nextId: null, previousId: null }
  return { nextId: ids[index + 1] ?? null, previousId: ids[index - 1] ?? null }
}

export function insertMobileNote(
  ids: readonly string[],
  noteId: string,
  position?: MobileNotePosition,
) {
  const next = ids.filter((id) => id !== noteId)
  const nextIndex = position?.nextId ? next.indexOf(position.nextId) : -1
  const previousIndex = position?.previousId ? next.indexOf(position.previousId) : -1
  let index = next.length
  if (previousIndex >= 0) index = previousIndex + 1
  if (nextIndex >= 0) index = nextIndex
  next.splice(index, 0, noteId)
  return next
}

export function moveMobileNoteId(ids: readonly string[], noteId: string, targetIndex: number) {
  if (!ids.includes(noteId) || !Number.isInteger(targetIndex)) return [...ids]
  const next = ids.filter((id) => id !== noteId)
  const index = Math.max(0, Math.min(targetIndex, next.length))
  next.splice(index, 0, noteId)
  return next
}
