export {
  IndexedDbNoteRepository,
  NOTE_STORE_NAME,
  StaleNoteRevisionError,
} from "./api/IndexedDbNoteRepository"
export {
  NoteContentReferenceSchema,
  NoteGeometrySchema,
  NoteRecordSchema,
  NoteReferenceSchema,
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
} from "./model/note"
