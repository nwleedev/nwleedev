"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { readUsage, type UsageReadState } from "./read-usage"
import { useUsageReader } from "./usage-reader-provider"

export function useUsageReadState() {
  const reader = useUsageReader()
  const readSequence = useRef(0)
  const [state, setState] = useState<UsageReadState>({ status: "loading" })

  const read = useCallback(() => {
    const sequence = readSequence.current + 1
    readSequence.current = sequence
    void readUsage(reader).then((nextState) => {
      if (readSequence.current === sequence) {
        setState(nextState)
      }
    })
  }, [reader])

  useEffect(() => {
    read()

    return () => {
      readSequence.current += 1
    }
  }, [read])

  function retry() {
    setState({ status: "loading" })
    read()
  }

  return { retry, state }
}
