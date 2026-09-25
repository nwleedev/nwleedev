import { z } from "zod"

export const AlgorithmReferenceSchema = z
  .object({
    type: z.string().min(1),
    version: z.string().min(1),
  })
  .strict()

export type AlgorithmReference = z.infer<typeof AlgorithmReferenceSchema>
