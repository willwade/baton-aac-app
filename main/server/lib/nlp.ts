import winkNLP from "wink-nlp";
import model from "wink-eng-lite-model";

const nlp = winkNLP(model);

export const getSentences = (text: string): string[] => {
  // Split on newlines - each line is already a complete phrase/sentence
  // Don't use wink-nlp sentence splitting as it may modify the text (add periods, etc.)
  const lines = text.split(/\n/).filter((line) => line.trim() !== "");

  return lines;
};
