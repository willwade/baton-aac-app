export interface BatonMetadata {
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
}

export interface BatonSentence {
  uuid: string;
  anonymousUUID: string | null;
  content: string;
  metadata?: BatonMetadata[];
  source: string;
}

export interface BatonExport {
  version: string;
  exportDate: string;
  encryption: string;
  sentenceCount: number;
  sentences: BatonSentence[];
}

export interface AnalysisResults {
  // Basic stats
  uniqueUtterances: number; // Number of unique phrases
  totalUtterances: number; // Total times phrases were said (including repetitions)
  totalWords: number;
  uniqueWords: number;

  // Mean Length of Utterance
  meanLengthOfUtterance: number;
  medianLengthOfUtterance: number;

  // Lexical diversity (MATTR-30)
  lexicalDiversity: number; // MATTR-30

  // Syntactic competence (MA-UPC-TWR-30)
  prepositionDiversity: number;
  conjunctionDiversity: number;
  combinedPrepConjDiversity: number; // MA-UPC-TWR-30

  // Morphological competence (MA-UMORPH-TLWR-30)
  morphologicalDiversity: number;

  // Additional useful stats
  vocabularySize: number;
  averageWordLength: number;

  // Word frequency
  topWords: Array<{ word: string; count: number }>;

  // Temporal stats (if metadata available)
  dateRange?: {
    earliest: string;
    latest: string;
    totalDays: number;
  };
  utterancesPerDay?: number;
}
