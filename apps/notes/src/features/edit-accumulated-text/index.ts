export {
  EditAccumulatedTextProvider,
  useAccumulatedTextEditor,
  type EditAccumulatedTextContextValue,
} from "./model/EditAccumulatedTextProvider"
export {
  copyAccumulatedText,
  type CopyAccumulatedTextResult,
} from "./model/copyAccumulatedText"
export {
  moveAccumulatedText,
  redoAccumulatedTextRemoval,
  removeAccumulatedText,
  undoAccumulatedTextRemoval,
  type EditAccumulatorExecution,
  type EditAccumulatorResult,
} from "./model/editAccumulatedText"
export { AccumulatorEditingView } from "./ui/AccumulatorEditingView"
export { AccumulatorHistoryShortcuts } from "./ui/AccumulatorHistoryShortcuts"
export { CopyAccumulatorAction } from "./ui/CopyAccumulatorAction"
