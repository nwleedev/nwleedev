export {
  IndexedDbTemplateRepository,
  TEMPLATE_STORE_NAME,
} from "./api/IndexedDbTemplateRepository"
export {
  TemplateRecordSchema,
  TemplateSegmentSchema,
  TemplateTitleSchema,
  findPlaceholderLabelIssues,
  parseTemplateRecord,
  type PlaceholderLabelIssue,
  type TemplateRepository,
  type TemplateSegment,
  type TextTemplate,
} from "./model/templateRecord"
export {
  createTemplateDraft,
  createTemplateDraftFromSegments,
  markPlaceholder,
  renamePlaceholder,
  restorePlaceholder,
  toTemplateSegments,
  type MarkPlaceholderResult,
  type TemplateDraft,
  type TemplatePlaceholderRange,
} from "./model/editSegments"
export { renderTemplate } from "./model/renderTemplate"
