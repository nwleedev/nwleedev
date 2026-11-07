"use client"

import { useEffect, useState, type PropsWithChildren } from "react"

import { IndexedDbContext } from "@/shared/lib/indexed-db/composition.browser"

import { PersonalNotesDatabase } from "../composition/indexed-db/personal-notes-database"

export function DatabaseProvider({ children }: PropsWithChildren) {
  const [database] = useState(() => new PersonalNotesDatabase())

  useEffect(() => () => database.close(), [database])

  return <IndexedDbContext value={database}>{children}</IndexedDbContext>
}
