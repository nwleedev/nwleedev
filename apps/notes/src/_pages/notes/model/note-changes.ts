import { z } from "zod"

import { EntityIdSchema } from "@/shared/lib/entity-metadata"

const NOTE_CHANNEL_NAME = "personal-notes-changes"
const NoteChangeSchema = z.object({
  type: z.enum(["created", "edited", "removed"]),
  noteId: EntityIdSchema,
})

export type NoteChange = z.infer<typeof NoteChangeSchema>

export function openNoteChanges(onChange: (change: NoteChange) => void) {
  const channel = new BroadcastChannel(NOTE_CHANNEL_NAME)
  channel.onmessage = ({ data }: MessageEvent<unknown>) => {
    const message = NoteChangeSchema.safeParse(data)
    if (message.success) onChange(message.data)
  }
  return channel
}
