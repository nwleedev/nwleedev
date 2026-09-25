import { useEffect, useState } from "react"

import { createLocalApplication } from "../composition/create-local-application"

export function useLocalApplication() {
  const [application] = useState(createLocalApplication)

  useEffect(() => () => application.dispose(), [application])

  return application
}
