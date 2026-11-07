import type * as fc from "fast-check"

const COMMAND_REPLAY_PATH = /\/\*replayPath="([^"]+)"\*\//u

export function replaySequence<Model extends object, Real>(
  details: fc.RunDetails<[Iterable<fc.AsyncCommand<Model, Real>>]>,
) {
  const commands = details.counterexample?.[0]
  const path = details.counterexamplePath

  if (commands === undefined || path === null) {
    throw new Error("Missing reduced command sequence")
  }

  const printed = String(commands)
  const replayPath = printed.match(COMMAND_REPLAY_PATH)?.[1]

  if (replayPath === undefined) {
    throw new Error("Missing command replay path")
  }

  return { commands, path, printed, replayPath }
}

