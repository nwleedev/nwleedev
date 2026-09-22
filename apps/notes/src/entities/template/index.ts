export {
  IndexedDbTemplateRepository,
  TEMPLATE_STORE_NAME,
} from "./api/indexed-db-template-repository"
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
} from "./model/template-record"
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
} from "./model/edit-segments"
export { renderTemplate } from "./model/render-template"
