import { AnalysisResults } from "./types";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const asciichart = require("asciichart");

export function generateTextReport(results: AnalysisResults): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("           BATON AAC LINGUISTIC ANALYSIS REPORT");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");

  // Basic Statistics
  lines.push("📊 BASIC STATISTICS");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(
    `Unique Utterances:       ${results.uniqueUtterances.toLocaleString()}`
  );
  lines.push(
    `Total Utterances:        ${results.totalUtterances.toLocaleString()} (including repetitions)`
  );
  lines.push(`Total Words:             ${results.totalWords.toLocaleString()}`);
  lines.push(
    `Unique Words:            ${results.uniqueWords.toLocaleString()}`
  );
  lines.push(
    `Vocabulary Size:         ${results.vocabularySize.toLocaleString()}`
  );
  lines.push(
    `Average Word Length:     ${results.averageWordLength.toFixed(
      2
    )} characters`
  );
  lines.push("");

  // Temporal Statistics
  if (results.dateRange) {
    lines.push("📅 TEMPORAL STATISTICS");
    lines.push(
      "───────────────────────────────────────────────────────────────"
    );
    lines.push(
      `Earliest Utterance:      ${new Date(
        results.dateRange.earliest
      ).toLocaleDateString()}`
    );
    lines.push(
      `Latest Utterance:        ${new Date(
        results.dateRange.latest
      ).toLocaleDateString()}`
    );
    lines.push(`Total Days:              ${results.dateRange.totalDays}`);
    lines.push(
      `Utterances per Day:      ${results.utterancesPerDay?.toFixed(2)}`
    );
    lines.push("");
  }

  // Mean Length of Utterance
  lines.push("📏 MEAN LENGTH OF UTTERANCE (MLU)");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(
    `Mean MLU:                ${results.meanLengthOfUtterance.toFixed(2)} words`
  );
  lines.push(
    `Median MLU:              ${results.medianLengthOfUtterance.toFixed(
      2
    )} words`
  );
  lines.push("");

  // Lexical Competence (AssistiveWare recommended measure)
  lines.push("📚 LEXICAL COMPETENCE");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(
    `MATTR-30:                ${(results.lexicalDiversity * 100).toFixed(2)}%`
  );
  lines.push("  (Moving Average Type-Token Ratio with 30-word window)");
  lines.push("  ⭐ PRIMARY INDICATOR of linguistic competence (AssistiveWare)");
  lines.push("");

  // Syntactic Competence
  lines.push("🔗 SYNTACTIC COMPETENCE");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(
    `Preposition Diversity:   ${(results.prepositionDiversity * 100).toFixed(
      2
    )}%`
  );
  lines.push(
    `Conjunction Diversity:   ${(results.conjunctionDiversity * 100).toFixed(
      2
    )}%`
  );
  lines.push(
    `Combined Prep+Conj:      ${(
      results.combinedPrepConjDiversity * 100
    ).toFixed(2)}%`
  );
  lines.push(
    "  (MA-UPC-TWR-30: Moving Average Unique Prep/Conj with 30-word window)"
  );
  lines.push("");

  // Morphological Competence
  lines.push("🔤 MORPHOLOGICAL COMPETENCE");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(
    `Morphological Diversity: ${(results.morphologicalDiversity * 100).toFixed(
      2
    )}%`
  );
  lines.push(
    "  (MA-UMORPH-TLWR-30: Moving Average Unique Morphological Forms)"
  );
  lines.push("  ⚠️  May be affected by standard vocabulary buttons");
  lines.push("");

  // Top Words
  lines.push("🏆 TOP 20 MOST FREQUENT WORDS");
  lines.push("───────────────────────────────────────────────────────────────");
  results.topWords.forEach((item, index) => {
    const rank = `${index + 1}.`.padEnd(4);
    const word = item.word.padEnd(20);
    const count = item.count.toString().padStart(6);
    lines.push(`${rank}${word}${count} times`);
  });
  lines.push("");

  // Visualizations
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("📊 VISUALIZATIONS");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");

  // Competence Measures Bar Chart
  lines.push("📈 COMPETENCE MEASURES COMPARISON");
  lines.push("───────────────────────────────────────────────────────────────");
  const competenceData = [
    results.lexicalDiversity * 100,
    results.combinedPrepConjDiversity * 100,
    results.morphologicalDiversity * 100,
  ];
  const competenceChart = asciichart.plot(competenceData, {
    height: 10,
    format: (x: number) => x.toFixed(1) + "%",
  });
  lines.push(competenceChart);
  lines.push("");
  lines.push("  1: Lexical Diversity (MATTR-30) ⭐ PRIMARY INDICATOR");
  lines.push("  2: Syntactic Competence (Prep+Conj)");
  lines.push("  3: Morphological Competence");
  lines.push("");

  // Top 10 Words Bar Chart
  lines.push("📊 TOP 10 WORDS FREQUENCY");
  lines.push("───────────────────────────────────────────────────────────────");
  const top10Data = results.topWords.slice(0, 10).map((w) => w.count);
  const wordsChart = asciichart.plot(top10Data, {
    height: 8,
    format: (x: number) => x.toFixed(0),
  });
  lines.push(wordsChart);
  lines.push("");
  results.topWords.slice(0, 10).forEach((item, index) => {
    lines.push(`  ${index + 1}: "${item.word}" (${item.count} times)`);
  });
  lines.push("");

  // Interpretation Guide
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("📖 INTERPRETATION GUIDE (Based on AssistiveWare Research)");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push("LEXICAL DIVERSITY (MATTR-30):");
  lines.push("  • Most robust overall measure of linguistic competence");
  lines.push("  • Works for emergent to proficient AAC users");
  lines.push("  • Higher values indicate greater vocabulary variety");
  lines.push("  • Typical range: 40-80% for proficient users");
  lines.push("");
  lines.push("SYNTACTIC COMPETENCE (Prep+Conj Diversity):");
  lines.push("  • Prepositions track early language development");
  lines.push("  • Conjunctions indicate more advanced syntax");
  lines.push("  • Combined measure shows sentence complexity");
  lines.push("");
  lines.push("MORPHOLOGICAL COMPETENCE:");
  lines.push("  • May be inflated by standard AAC vocabulary buttons");
  lines.push("  • More reliable for text-based AAC users");
  lines.push("  • Consider in context with other measures");
  lines.push("");
  lines.push("MEAN LENGTH OF UTTERANCE (MLU):");
  lines.push("  • Traditional measure but sensitive to operational skills");
  lines.push("  • Use alongside lexical diversity for full picture");
  lines.push("  • Typical range: 3-8 words for proficient users");
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

export function generateJSONReport(results: AnalysisResults): string {
  return JSON.stringify(results, null, 2);
}
