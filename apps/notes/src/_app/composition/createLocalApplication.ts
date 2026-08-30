import {
  WorkerTextAnalyzer,
  type TextAnalyzer,
} from "@/_pages/analysis"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

export type LocalApplication = {
  analysis: {
    analyzer: TextAnalyzer
  }
  dispose(): void
}

export function createLocalApplication(): LocalApplication {
  const identifiers = new CryptoEntityIdGenerator()
  const analyzer = new WorkerTextAnalyzer(identifiers)

  return {
    analysis: { analyzer },
    dispose: () => analyzer.dispose(),
  }
}
