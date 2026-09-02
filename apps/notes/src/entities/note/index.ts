export {
  IndexedDbNoteRepository,
  NOTE_STORE_NAME,
  StaleNoteRevisionError,
} from "./api/indexed-db-note-repository"
export {
  IndexedDbNoteDraftRepository,
  NOTE_DRAFT_STORE_NAME,
} from "./api/indexed-db-note-draft-repository"
export {
  NOTE_CANVAS_SIZE,
  NOTE_HEIGHT_MAX,
  NOTE_HEIGHT_MIN,
  NOTE_TAB_INDEX_MAX,
  NOTE_TAB_INDEX_MIN,
  NOTE_WIDTH_MAX,
  NOTE_WIDTH_MIN,
  NoteContentReferenceSchema,
  NoteGeometrySchema,
  NoteRecordSchema,
  NoteReferenceSchema,
  NoteTabIndexSchema,
  createNoteReference,
  parseNoteRecord,
  reviseNote,
  type Note,
  type NoteContentReference,
  type NoteGeometry,
  type NoteReader,
  type NoteReference,
  type NoteRepository,
  type NoteRevision,
  type NoteTabIndex,
} from "./model/note"
export {
  NoteGeometryDraftSchema,
  findNewNoteGeometry,
  fitNoteGeometryToCanvas,
  readNoteGeometryDraft,
  type NoteGeometryDraft,
  type NoteGeometryDraftField,
  type NoteGeometryDraftResult,
} from "./model/note-geometry"
export {
  nextNoteTabIndex,
  normalizeNoteTabIndexes,
  normalizeNoteZIndexes,
  sendNoteToBack,
  sendNoteToFront,
} from "./model/note-order"
export {
  NoteDraftSchema,
  isRecoverableNoteDraft,
  parseNoteDraft,
  type NoteDraft,
  type NoteDraftRepository,
} from "./model/note-draft"
export {
  createNoteRemovalHistory,
  rememberRemovedNote,
  restoreMostRecentlyRemovedNote,
  type NoteRemovalHistory,
  type RemovedNoteSnapshot,
} from "./model/note-removal-history"
