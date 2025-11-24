#!/usr/bin/env node

import * as fs from "fs";
import { program } from "commander";
import { BatonExport } from "./types";
import { BatonAnalyzer } from "./analyzer";
import { generateTextReport, generateJSONReport } from "./report";

program
  .name("baton-analyze")
  .description("Linguistic analysis tool for Baton AAC exports")
  .version("1.0.0")
  .argument("<file>", "Path to Baton export JSON file")
  .option("-o, --output <file>", "Output file for report (default: stdout)")
  .option("-f, --format <format>", "Output format: text or json", "text")
  .action((file: string, options: { output?: string; format: string }) => {
    try {
      // Read and parse the export file
      console.error(`📖 Reading export file: ${file}`);
      const fileContent = fs.readFileSync(file, "utf-8");
      const data: BatonExport = JSON.parse(fileContent);

      console.error(`✅ Loaded ${data.sentenceCount} sentences`);
      console.error(`🔍 Running linguistic analysis...`);

      // Run analysis
      const analyzer = new BatonAnalyzer(data);
      const results = analyzer.analyze();

      console.error(`✅ Analysis complete!`);
      console.error("");

      // Generate report
      let report: string;
      if (options.format === "json") {
        report = generateJSONReport(results);
      } else {
        report = generateTextReport(results);
      }

      // Output report
      if (options.output) {
        fs.writeFileSync(options.output, report, "utf-8");
        console.error(`📄 Report saved to: ${options.output}`);
      } else {
        console.log(report);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Error: ${error.message}`);
      } else {
        console.error(`❌ Unknown error occurred`);
      }
      process.exit(1);
    }
  });

program.parse();
