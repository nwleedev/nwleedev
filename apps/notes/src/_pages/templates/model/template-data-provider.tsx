"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react"

import {
  parseTemplateRecord,
  type TemplateRepository,
  type TemplateSegment,
  type TextTemplate,
} from "@/entities/template"
import type {
  ClipboardWriteFailureReason,
  ClipboardWriter,
} from "@/shared/lib/clipboard"

type TemplateDataState =
  | { status: "loading" }
  | { status: "load-failure" }
  | { templates: readonly TextTemplate[]; status: "ready" }

export type CreateTemplateResult =
  | { status: "failure" }
  | { status: "saved"; template: TextTemplate }

export type CopyTemplateResult =
  | { status: "copied" }
  | { reason: ClipboardWriteFailureReason; status: "failure" }

type TemplateDataContextValue = TemplateDataState & {
  copyText(text: string): Promise<CopyTemplateResult>
  createTemplate(input: {
    segments: readonly TemplateSegment[]
    title: string
  }): Promise<CreateTemplateResult>
  retry(): void
}

const TemplateDataContext = createContext<TemplateDataContextValue | null>(
  null,
)

function sortTemplates(templates: readonly TextTemplate[]) {
  return [...templates].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  )
}

async function readTemplates(
  repository: TemplateRepository,
): Promise<TemplateDataState> {
  try {
    const templates = await repository.getAll()
    return { status: "ready", templates: sortTemplates(templates) }
  } catch {
    return { status: "load-failure" }
  }
}

type TemplateDataProviderProps = PropsWithChildren<{
  clipboard: ClipboardWriter
  createId(): string
  now(): string
  repository: TemplateRepository
}>

export function TemplateDataProvider({
  children,
  clipboard,
  createId,
  now,
  repository,
}: TemplateDataProviderProps) {
  const [state, setState] = useState<TemplateDataState>({ status: "loading" })

  useEffect(() => {
    let active = true
    void readTemplates(repository).then((nextState) => {
      if (active) {
        setState(nextState)
      }
    })

    return () => {
      active = false
    }
  }, [repository])

  function retry() {
    setState({ status: "loading" })
    void readTemplates(repository).then(setState)
  }

  async function createTemplate(input: {
    segments: readonly TemplateSegment[]
    title: string
  }): Promise<CreateTemplateResult> {
    const timestamp = now()

    try {
      const template = parseTemplateRecord({
        createdAt: timestamp,
        id: createId(),
        revision: 0,
        segments: input.segments,
        title: input.title,
        updatedAt: timestamp,
      })
      const savedTemplate = await repository.save(template)
      setState((current) => {
        const templates = current.status === "ready"
          ? current.templates
          : []

        return {
          status: "ready",
          templates: sortTemplates([savedTemplate, ...templates]),
        }
      })
      return { status: "saved", template: savedTemplate }
    } catch {
      return { status: "failure" }
    }
  }

  async function copyText(text: string): Promise<CopyTemplateResult> {
    const result = await clipboard.writeText(text)

    if (result.status === "failed") {
      return { reason: result.reason, status: "failure" }
    }

    return { status: "copied" }
  }

  return (
    <TemplateDataContext
      value={{ ...state, copyText, createTemplate, retry }}
    >
      {children}
    </TemplateDataContext>
  )
}

export function useTemplateData() {
  const context = useContext(TemplateDataContext)

  if (context === null) {
    throw new Error("useTemplateData must be used within TemplateDataProvider")
  }

  return context
}
