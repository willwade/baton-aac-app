import { BatonExport, BatonSentence, AnalysisResults } from "./types";
import {
  tokenize,
  calculateMATTR,
  calculateWordTypeDiversity,
  calculateMorphologicalDiversity,
  PREPOSITIONS,
  CONJUNCTIONS,
} from "./linguistic-utils";

export class BatonAnalyzer {
  private data: BatonExport;

  constructor(data: BatonExport) {
    this.data = data;
  }

  /**
   * Run complete analysis on the export data
   */
  public analyze(): AnalysisResults {
    const sentences = this.data.sentences;

    // Expand sentences based on metadata (each occurrence counts separately)
    const expandedSentences = this.expandSentencesByOccurrences(sentences);

    const allWords = this.getAllWords(expandedSentences);
    const wordCounts = this.getWordCounts(allWords);
    const utteranceLengths = this.getUtteranceLengths(expandedSentences);

    // Basic stats
    const uniqueUtterances = sentences.length; // Original unique phrases
    const totalUtterances = expandedSentences.length; // Total including repetitions
    const totalWords = allWords.length;
    const uniqueWords = new Set(allWords).size;
    const vocabularySize = uniqueWords;

    // MLU (Mean Length of Utterance)
    const meanLengthOfUtterance = totalWords / totalUtterances;
    const medianLengthOfUtterance = this.calculateMedian(utteranceLengths);

    // Lexical diversity (MATTR-30)
    const lexicalDiversity = calculateMATTR(allWords, 30);

    // Syntactic competence
    const prepositionDiversity = calculateWordTypeDiversity(
      allWords,
      PREPOSITIONS,
      30
    );
    const conjunctionDiversity = calculateWordTypeDiversity(
      allWords,
      CONJUNCTIONS,
      30
    );

    // Combined preposition and conjunction diversity
    const prepAndConj = new Set([...PREPOSITIONS, ...CONJUNCTIONS]);
    const combinedPrepConjDiversity = calculateWordTypeDiversity(
      allWords,
      prepAndConj,
      30
    );

    // Morphological diversity
    const morphologicalDiversity = calculateMorphologicalDiversity(
      allWords,
      30
    );

    // Average word length
    const averageWordLength =
      allWords.reduce((sum, word) => sum + word.length, 0) / totalWords;

    // Top words
    const topWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    // Temporal stats
    const dateRange = this.getDateRange(sentences);
    const utterancesPerDay = dateRange
      ? totalUtterances / Math.max(1, dateRange.totalDays)
      : undefined;

    return {
      uniqueUtterances,
      totalUtterances,
      totalWords,
      uniqueWords,
      meanLengthOfUtterance,
      medianLengthOfUtterance,
      lexicalDiversity,
      prepositionDiversity,
      conjunctionDiversity,
      combinedPrepConjDiversity,
      morphologicalDiversity,
      vocabularySize,
      averageWordLength,
      topWords,
      dateRange,
      utterancesPerDay,
    };
  }

  /**
   * Expand sentences based on metadata occurrences
   * If a sentence was said 3 times, it should count as 3 separate utterances
   */
  private expandSentencesByOccurrences(
    sentences: BatonSentence[]
  ): BatonSentence[] {
    const expanded: BatonSentence[] = [];

    for (const sentence of sentences) {
      if (sentence.metadata && sentence.metadata.length > 0) {
        // Create one entry per occurrence
        for (const meta of sentence.metadata) {
          expanded.push({
            ...sentence,
            metadata: [meta], // Single occurrence
          });
        }
      } else {
        // No metadata, count as single occurrence
        expanded.push(sentence);
      }
    }

    return expanded;
  }

  /**
   * Get all words from all sentences
   */
  private getAllWords(sentences: BatonSentence[]): string[] {
    const allWords: string[] = [];
    for (const sentence of sentences) {
      const words = tokenize(sentence.content);
      allWords.push(...words);
    }
    return allWords;
  }

  /**
   * Get word frequency counts
   */
  private getWordCounts(words: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const word of words) {
      counts.set(word, (counts.get(word) || 0) + 1);
    }
    return counts;
  }

  /**
   * Get utterance lengths (in words)
   */
  private getUtteranceLengths(sentences: BatonSentence[]): number[] {
    return sentences.map((s) => tokenize(s.content).length);
  }

  /**
   * Calculate median of an array of numbers
   */
  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  /**
   * Get date range from metadata
   */
  private getDateRange(
    sentences: BatonSentence[]
  ): AnalysisResults["dateRange"] {
    const timestamps: Date[] = [];

    for (const sentence of sentences) {
      if (sentence.metadata) {
        for (const meta of sentence.metadata) {
          timestamps.push(new Date(meta.timestamp));
        }
      }
    }

    if (timestamps.length === 0) return undefined;

    const sorted = timestamps.sort((a, b) => a.getTime() - b.getTime());
    const earliest = sorted[0];
    const latest = sorted[sorted.length - 1];
    const totalDays = Math.ceil(
      (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      earliest: earliest.toISOString(),
      latest: latest.toISOString(),
      totalDays: Math.max(1, totalDays),
    };
  }
}
