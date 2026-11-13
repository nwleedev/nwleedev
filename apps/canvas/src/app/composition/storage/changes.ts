import type { ProjectChange } from "@/entities/project"

function isProjectChange(value: unknown): value is ProjectChange {
  return typeof value === "object" && value !== null &&
    "projectId" in value && typeof value.projectId === "string" &&
    "revision" in value && typeof value.revision === "number" &&
    Number.isSafeInteger(value.revision) && value.revision >= 0
}

export function projectChanges(databaseName: string) {
  let channel: BroadcastChannel | undefined

  function open() {
    channel ??= new BroadcastChannel(`${databaseName}:projects`)
    return channel
  }

  return {
    publish(change: ProjectChange) {
      try {
        open().postMessage(change)
      } catch {
        // IndexedDB has already committed. Visible tabs can check it again.
      }
    },
    subscribe(listener: (change: ProjectChange) => void) {
      const target = open()
      function receive(event: MessageEvent<unknown>) {
        if (isProjectChange(event.data)) listener(event.data)
      }
      target.addEventListener("message", receive)
      return () => target.removeEventListener("message", receive)
    },
    close() {
      channel?.close()
      channel = undefined
    },
  }
}
