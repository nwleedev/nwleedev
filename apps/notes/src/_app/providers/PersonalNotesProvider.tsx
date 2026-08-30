"use client"

import { useEffect, useState, type PropsWithChildren } from "react"

import { TextAnalysisProvider } from "@/_pages/analysis"

import { createLocalApplication } from "../composition/createLocalApplication"

export function PersonalNotesProvider({ children }: PropsWithChildren) {
  const [application] = useState(createLocalApplication)

  useEffect(() => {
    return () => application.dispose()
  }, [application])

  return (
    <TextAnalysisProvider analyzer={application.analysis.analyzer}>
      {children}
    </TextAnalysisProvider>
  )
}
