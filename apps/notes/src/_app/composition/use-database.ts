import { useEffect, useState } from "react"

import { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function useDatabase() {
  const [database] = useState(() => new PersonalNotesDatabase())

  useEffect(() => () => database.close(), [database])

  return database
}
