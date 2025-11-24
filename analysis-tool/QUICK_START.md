# Quick Start Guide

## 🚀 Get Started in 2 Steps

### 1. Install Dependencies

```bash
cd analysis-tool
yarn install
```

### 2. Run Analysis

```bash
yarn quick ../baton-export-2025-11-24-fixed.json
```

That's it! You'll see a detailed linguistic analysis report in your terminal.

---

## 📊 What You'll Get

The tool analyzes your AAC data and provides:

### ⭐ **Primary Measure: Lexical Diversity (MATTR-30)**
- The most robust indicator of linguistic competence
- Works for all AAC users from emergent to proficient
- Recommended by AssistiveWare research

### 📏 **Mean Length of Utterance (MLU)**
- Average words per utterance
- Traditional measure of language complexity

### 🔗 **Syntactic Competence**
- Preposition diversity (early language)
- Conjunction diversity (advanced syntax)
- Combined measure

### 🔤 **Morphological Competence**
- Use of word endings (ed, ing, s, ly, etc.)
- Indicates grammatical sophistication

### 📈 **Frequency Analysis**
- Top 20 most used words
- Vocabulary size
- Word usage patterns

### 📅 **Temporal Statistics**
- Date range of data
- Utterances per day
- Usage patterns over time

---

## 💾 Save Report to File

```bash
yarn quick ../baton-export-2025-11-24-fixed.json -o my-report.txt
```

## 📋 Get JSON Output

```bash
yarn quick ../baton-export-2025-11-24-fixed.json -f json -o results.json
```

---

## 🔬 Research Background

This tool implements the linguistic analysis measures from AssistiveWare's research paper:

**Key Finding:** Lexical diversity (MATTR-30) is the strongest and most robust overall measure of linguistic competence for AAC users.

**Why MATTR-30?**
- Insensitive to motor/operational skills (unlike MLU)
- Works with small language samples
- Correlates well with other competence indicators (r > 0.55)
- Applicable to all proficiency levels

---

## 📖 Understanding Your Results

### Lexical Diversity (MATTR-30)
- **40-60%**: Emerging vocabulary variety
- **60-80%**: Good vocabulary variety
- **80%+**: Excellent vocabulary variety

### Mean Length of Utterance
- **1-3 words**: Single/two-word stage
- **3-5 words**: Simple sentences
- **5-8 words**: Complex sentences
- **8+ words**: Advanced language use

### Syntactic Competence
- **Prepositions**: Track early language development
- **Conjunctions**: Indicate sentence complexity
- **Higher diversity** = More sophisticated syntax

---

## 🛠️ Troubleshooting

**Problem:** `yarn: command not found`
- Make sure you're in the main baton-aac-app directory first
- The project uses yarn as its package manager

**Problem:** `Cannot find module`
- Run `yarn install` in the analysis-tool directory

**Problem:** File not found
- Check the path to your export file
- Use relative paths from the analysis-tool directory

---

## 📚 More Information

See [README.md](README.md) for full documentation and technical details.

