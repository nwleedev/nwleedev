import type { EntityId } from "@/shared/lib/entity-metadata"

export interface EntityIdGenerator {
  create(): EntityId
}

export class CryptoEntityIdGenerator implements EntityIdGenerator {
  create(): EntityId {
    return globalThis.crypto.randomUUID()
  }
}
