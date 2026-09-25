import { useId } from "react"

export function useCheckboxId(id: string | undefined, description: string | undefined) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = description ? `${inputId}-description` : undefined

  return { descriptionId, inputId }
}
