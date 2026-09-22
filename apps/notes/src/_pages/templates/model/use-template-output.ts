"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"

import {
  renderTemplate,
  type TextTemplate,
} from "@/entities/template"
import type { ClipboardWriteFailureReason } from "@/shared/lib/clipboard"

import { useTemplateData } from "./template-data-provider"

export type TemplateValueFields = {
  values: Record<string, string>
}

export type OutputStatus = "idle" | "copied" | ClipboardWriteFailureReason

type GeneratedOutput = {
  copying: boolean
  status: OutputStatus
  text: string
}

export function useTemplateOutput(template: TextTemplate) {
  const templates = useTemplateData()
  const [output, setOutput] = useState<GeneratedOutput | null>(null)
  const form = useForm<TemplateValueFields>({
    defaultValues: { values: {} },
  })

  function generateText(fields: TemplateValueFields) {
    setOutput({
      copying: false,
      status: "idle",
      text: renderTemplate(template.segments, fields.values),
    })
  }

  async function copyOutput() {
    const snapshot = output

    if (snapshot === null || snapshot.copying) {
      return
    }

    const pending = { ...snapshot, copying: true, status: "idle" as const }
    setOutput(pending)
    const result = await templates.copyText(snapshot.text)

    setOutput((current) => {
      if (current !== pending) {
        return current
      }

      return {
        copying: false,
        status: result.status === "copied" ? "copied" : result.reason,
        text: snapshot.text,
      }
    })
  }

  return {
    copyOutput: () => void copyOutput(),
    errors: form.formState.errors,
    output,
    placeholders: template.segments.filter(
      (segment) => segment.kind === "placeholder",
    ),
    register: form.register,
    submitValues: form.handleSubmit(generateText),
  }
}
