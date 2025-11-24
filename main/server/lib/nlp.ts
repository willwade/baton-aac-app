import winkNLP from "wink-nlp";
import model from "wink-eng-lite-model";

const nlp = winkNLP(model);

export const getSentences = (text: string): string[] => {
  // First split on newlines (for pre-separated phrases like from Grid3)
  // Then use wink-nlp to further split each line into sentences
  const lines = text.split(/\n/).filter((line) => line.trim() !== "");

  const allSentences: string[] = [];

  for (const line of lines) {
    const doc = nlp.readDoc(line);
    const sentences = doc
      .sentences()
      .out()
      .map((s: string) => s.trim())
      .filter((s: string) => s !== "");

    allSentences.push(...sentences);
  }

  return allSentences;
};
