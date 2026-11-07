import type { PropsWithChildren } from "react"

import { TextAnalysisProvider } from "@/_pages/analysis/composition"

import { useAnalysisServices } from "./use-analysis-services"

export function Analysis({ children }: PropsWithChildren) {
  const { analyzer, now, reader } = useAnalysisServices()

  return (
    <TextAnalysisProvider analyzer={analyzer} now={now} reader={reader}>
      {children}
    </TextAnalysisProvider>
  )
}
