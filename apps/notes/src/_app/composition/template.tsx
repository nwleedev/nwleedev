import type { PropsWithChildren } from "react"

import { TemplateDataProvider } from "@/_pages/templates/composition"

import { useTemplateServices } from "./use-template-services"

export function Template({ children }: PropsWithChildren) {
  const { clipboard, createId, now, repository } =
    useTemplateServices()

  return (
    <TemplateDataProvider
      clipboard={clipboard}
      createId={createId}
      now={now}
      repository={repository}
    >
      {children}
    </TemplateDataProvider>
  )
}
