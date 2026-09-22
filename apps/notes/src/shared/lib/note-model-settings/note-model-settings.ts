export type NoteModelProfile = "local-fast" | "main" | "nightly" | "pr"

type NoteModelSettings = {
  interruptAfterTimeLimit: number
  maxCommands: number
  numRuns: number
}

const settings: Record<NoteModelProfile, NoteModelSettings> = {
  "local-fast": { interruptAfterTimeLimit: 5_000, maxCommands: 20, numRuns: 100 },
  main: { interruptAfterTimeLimit: 20_000, maxCommands: 60, numRuns: 500 },
  nightly: { interruptAfterTimeLimit: 60_000, maxCommands: 120, numRuns: 2_000 },
  pr: { interruptAfterTimeLimit: 10_000, maxCommands: 40, numRuns: 250 },
}

function isNoteModelProfile(value: string): value is NoteModelProfile {
  return value in settings
}

const configuredProfile = process.env.NOTES_MODEL_PROFILE

export const noteModelProfile: NoteModelProfile =
  configuredProfile !== undefined && isNoteModelProfile(configuredProfile)
    ? configuredProfile
    : "local-fast"

export const noteModelSettings = settings[noteModelProfile]
