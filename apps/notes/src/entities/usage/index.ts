export {
  IndexedDbUsageRepository,
  USAGE_BY_NOTE_CONTENT_INDEX,
  USAGE_STORE_NAME,
} from "./api/indexed-db-usage-repository"
export {
  TextUsageRecordSchema,
  UsageCountsSchema,
  parseTextUsageRecord,
  type OrdinaryCopyUsageWriter,
  type TextUsage,
  type TextUsageReader,
} from "./model/text-usage-record"
