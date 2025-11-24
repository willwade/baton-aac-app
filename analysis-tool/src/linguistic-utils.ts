import winkNLP from "wink-nlp";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const model = require("wink-eng-lite-model");

const nlp = winkNLP(model);

/**
 * Legacy hardcoded lists - kept for fallback
 * Better to use NLP POS tagging when possible
 */
export const PREPOSITIONS = new Set([
  "about",
  "above",
  "across",
  "after",
  "against",
  "along",
  "among",
  "around",
  "at",
  "before",
  "behind",
  "below",
  "beneath",
  "beside",
  "between",
  "beyond",
  "by",
  "down",
  "during",
  "except",
  "for",
  "from",
  "in",
  "inside",
  "into",
  "like",
  "near",
  "of",
  "off",
  "on",
  "onto",
  "out",
  "outside",
  "over",
  "past",
  "since",
  "through",
  "throughout",
  "to",
  "toward",
  "under",
  "underneath",
  "until",
  "up",
  "upon",
  "with",
  "within",
  "without",
]);

/**
 * Common English conjunctions
 */
export const CONJUNCTIONS = new Set([
  "and",
  "but",
  "or",
  "nor",
  "for",
  "yet",
  "so",
  "after",
  "although",
  "as",
  "because",
  "before",
  "if",
  "once",
  "since",
  "than",
  "that",
  "though",
  "till",
  "unless",
  "until",
  "when",
  "where",
  "whether",
  "while",
]);

/**
 * Common morphological endings
 */
export const MORPHOLOGICAL_SUFFIXES = [
  "ed",
  "ing",
  "s",
  "es",
  "er",
  "est",
  "ly",
  "ness",
  "ment",
  "tion",
  "sion",
  "ful",
  "less",
  "able",
  "ible",
  "al",
  "ial",
  "ous",
  "ious",
];

/**
 * Tokenize text into words (lowercase, remove punctuation)
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

/**
 * Get prepositions from text using NLP POS tagging
 */
export function getPrepositions(text: string): string[] {
  const doc = nlp.readDoc(text);
  const prepositions: string[] = [];

  doc.tokens().each((token: any) => {
    if (token.out("pos") === "ADP") {
      // ADP = Adposition (preposition)
      prepositions.push(token.out("normal"));
    }
  });

  return prepositions;
}

/**
 * Get conjunctions from text using NLP POS tagging
 */
export function getConjunctions(text: string): string[] {
  const doc = nlp.readDoc(text);
  const conjunctions: string[] = [];

  doc.tokens().each((token: any) => {
    if (token.out("pos") === "CCONJ" || token.out("pos") === "SCONJ") {
      // CCONJ = Coordinating conjunction (and, but, or)
      // SCONJ = Subordinating conjunction (because, if, when)
      conjunctions.push(token.out("normal"));
    }
  });

  return conjunctions;
}

/**
 * Calculate Type-Token Ratio (TTR) for a window of words
 */
export function calculateTTR(words: string[]): number {
  if (words.length === 0) return 0;
  const uniqueWords = new Set(words);
  return uniqueWords.size / words.length;
}

/**
 * Calculate Moving Average Type-Token Ratio (MATTR)
 * This is the lexical diversity measure recommended by AssistiveWare
 *
 * @param words - Array of all words
 * @param windowSize - Window size (default 30 as per AssistiveWare paper)
 */
export function calculateMATTR(words: string[], windowSize = 30): number {
  if (words.length < windowSize) {
    // If we don't have enough words, just calculate TTR for what we have
    return calculateTTR(words);
  }

  let sumTTR = 0;
  let windowCount = 0;

  // Slide the window across all words
  for (let i = 0; i <= words.length - windowSize; i++) {
    const window = words.slice(i, i + windowSize);
    sumTTR += calculateTTR(window);
    windowCount++;
  }

  return windowCount > 0 ? sumTTR / windowCount : 0;
}

/**
 * Calculate diversity of specific word types using NLP POS tagging
 * @param text - Full text to analyze
 * @param posTypes - Array of POS tags to match (e.g., ['ADP'] for prepositions)
 * @param windowSize - Window size for moving average
 */
export function calculatePOSDiversity(
  text: string,
  posTypes: string[],
  windowSize = 30
): number {
  const doc = nlp.readDoc(text);
  const allWords: string[] = [];
  const targetWords: string[] = [];

  doc.tokens().each((token: any) => {
    const word = token.out("normal");
    const pos = token.out("pos");

    allWords.push(word);
    if (posTypes.includes(pos)) {
      targetWords.push(word);
    }
  });

  if (allWords.length < windowSize) {
    return targetWords.length > 0
      ? new Set(targetWords).size / targetWords.length
      : 0;
  }

  // Calculate moving average
  let sumDiversity = 0;
  let windowCount = 0;

  for (let i = 0; i <= allWords.length - windowSize; i++) {
    const windowWords = allWords.slice(i, i + windowSize);
    const windowTargets = windowWords.filter((w) => targetWords.includes(w));

    if (windowTargets.length > 0) {
      sumDiversity += new Set(windowTargets).size / windowTargets.length;
    }
    windowCount++;
  }

  return windowCount > 0 ? sumDiversity / windowCount : 0;
}

/**
 * Calculate diversity of specific word types (prepositions, conjunctions, etc.)
 * using moving average method - LEGACY VERSION using hardcoded lists
 */
export function calculateWordTypeDiversity(
  words: string[],
  wordSet: Set<string>,
  windowSize = 30
): number {
  if (words.length < windowSize) {
    // Count unique words from the set in the available words
    const matchingWords = words.filter((w) => wordSet.has(w));
    return new Set(matchingWords).size / Math.max(1, matchingWords.length);
  }

  let sumDiversity = 0;
  let windowCount = 0;

  for (let i = 0; i <= words.length - windowSize; i++) {
    const window = words.slice(i, i + windowSize);
    const matchingWords = window.filter((w) => wordSet.has(w));

    if (matchingWords.length > 0) {
      const uniqueMatching = new Set(matchingWords);
      sumDiversity += uniqueMatching.size / matchingWords.length;
      windowCount++;
    }
  }

  return windowCount > 0 ? sumDiversity / windowCount : 0;
}

/**
 * Detect if a word has morphological markers
 */
export function hasMorphologicalMarker(word: string): boolean {
  if (word.length < 3) return false;

  for (const suffix of MORPHOLOGICAL_SUFFIXES) {
    if (word.endsWith(suffix)) {
      // Check if there's a reasonable stem (at least 2 chars before suffix)
      const stem = word.slice(0, -suffix.length);
      if (stem.length >= 2) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculate morphological diversity using moving average
 */
export function calculateMorphologicalDiversity(
  words: string[],
  windowSize = 30
): number {
  if (words.length < windowSize) {
    const morphWords = words.filter(hasMorphologicalMarker);
    return morphWords.length / Math.max(1, words.length);
  }

  let sumDiversity = 0;
  let windowCount = 0;

  for (let i = 0; i <= words.length - windowSize; i++) {
    const window = words.slice(i, i + windowSize);
    const morphWords = window.filter(hasMorphologicalMarker);
    const uniqueMorphWords = new Set(morphWords);

    if (window.length > 0) {
      sumDiversity += uniqueMorphWords.size / window.length;
      windowCount++;
    }
  }

  return windowCount > 0 ? sumDiversity / windowCount : 0;
}
