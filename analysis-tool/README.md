# Baton AAC Linguistic Analysis Tool

A standalone Node.js tool for analyzing linguistic competence in AAC (Augmentative and Alternative Communication) data exported from Baton.

## Features

This tool implements the linguistic analysis measures recommended by AssistiveWare's research paper on AAC linguistic competence assessment:

### 📚 **Lexical Competence** (Primary Indicator)
- **MATTR-30**: Moving Average Type-Token Ratio with 30-word window
- Most robust overall measure of linguistic competence
- Works for emergent to proficient AAC users

### 🔗 **Syntactic Competence**
- **MA-UPC-TWR-30**: Moving Average Unique Preposition/Conjunction diversity
- Preposition diversity (early language development)
- Conjunction diversity (advanced syntax)
- Combined preposition and conjunction diversity

### 🔤 **Morphological Competence**
- **MA-UMORPH-TLWR-30**: Moving Average Unique Morphological Forms
- Detects use of suffixes (ed, ing, s, ly, etc.)
- Note: May be affected by standard AAC vocabulary buttons

### 📏 **Mean Length of Utterance (MLU)**
- Traditional measure of language complexity
- Mean and median utterance length in words

### 📊 **Additional Statistics**
- Total utterances and words
- Vocabulary size (unique words)
- Word frequency analysis
- Temporal statistics (date range, utterances per day)

## Installation

From the **main baton-aac-app directory**:

```bash
cd analysis-tool
yarn install
```

## Usage

### Quick Analysis (No Build Required)

From the `analysis-tool` directory:

```bash
yarn quick ../baton-export-2025-11-24-fixed.json
```

### Basic Analysis (Text Report)

```bash
yarn build
yarn start ../baton-export-2025-11-24-fixed.json
```

### Save Report to File

```bash
yarn start ../baton-export-2025-11-24-fixed.json -o report.txt
```

### JSON Output

```bash
yarn start ../baton-export-2025-11-24-fixed.json -f json -o results.json
```

### From Main Project Directory

You can also run from the main baton-aac-app directory:

```bash
cd analysis-tool
yarn quick ../baton-export-2025-11-24-fixed.json
```

## Command Line Options

```
Usage: baton-analyze [options] <file>

Arguments:
  file                    Path to Baton export JSON file

Options:
  -o, --output <file>     Output file for report (default: stdout)
  -f, --format <format>   Output format: text or json (default: "text")
  -h, --help              Display help
  -V, --version           Display version
```

## Example Output

```
═══════════════════════════════════════════════════════════════
           BATON AAC LINGUISTIC ANALYSIS REPORT
═══════════════════════════════════════════════════════════════

📊 BASIC STATISTICS
───────────────────────────────────────────────────────────────
Total Utterances:        389
Total Words:             2,145
Unique Words:            456
Vocabulary Size:         456
Average Word Length:     4.23 characters

📏 MEAN LENGTH OF UTTERANCE (MLU)
───────────────────────────────────────────────────────────────
Mean MLU:                5.51 words
Median MLU:              5.00 words

📚 LEXICAL COMPETENCE
───────────────────────────────────────────────────────────────
MATTR-30:                67.45%
  (Moving Average Type-Token Ratio with 30-word window)
  ⭐ PRIMARY INDICATOR of linguistic competence (AssistiveWare)

🔗 SYNTACTIC COMPETENCE
───────────────────────────────────────────────────────────────
Preposition Diversity:   12.34%
Conjunction Diversity:   8.76%
Combined Prep+Conj:      18.92%
  (MA-UPC-TWR-30: Moving Average Unique Prep/Conj)
```

## Research Background

This tool implements measures from AssistiveWare's research on linguistic competence assessment for AAC users. Key findings:

1. **Lexical diversity (MATTR-30)** is the strongest and most robust overall measure
2. **Preposition/Conjunction diversity** indicates syntactic complexity
3. **Morphological diversity** works better for text-based AAC
4. **MLU** should be used alongside other measures (sensitive to motor skills)

## Technical Details

- **Language**: TypeScript/Node.js
- **Window Size**: 30 words (as recommended by AssistiveWare)
- **Tokenization**: Lowercase, punctuation removed
- **Prepositions**: 47 common English prepositions
- **Conjunctions**: 26 common English conjunctions
- **Morphological Suffixes**: 19 common English suffixes

## License

MIT

