#!/usr/bin/env ts-node
/**
 * CLI tool for testing Grid3 import/export without the UI
 *
 * Usage:
 *   yarn test-import-export
 */

import "reflect-metadata";
import { createConnection } from "typeorm";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Settings } from "../main/server/models/entity/Settings";
import { Sentence } from "../main/server/models/entity/Sentence";
import { App } from "../main/server/models/entity/App";
import { Grid } from "../main/server/apps/grid";
import { EPossibleSources } from "../main/server/apps/types";
import { getSentences } from "../main/server/lib/nlp";
import chunk from "chunk";

const TEST_DB_PATH = path.join(__dirname, "../test-db.sqlite");
const GRID_PATH = path.join(
  __dirname,
  "../test-data/Grid 3/Users/will wade/en-GB/Phrases/history.sqlite"
);
const OUTPUT_PATH = path.join(__dirname, "../test-export.json");

async function main() {
  console.log("🧪 Testing Grid3 Import/Export\n");

  // Delete old test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
    console.log("✅ Deleted old test database");
  }

  // Create connection
  const connection = await createConnection({
    type: "sqlite",
    database: TEST_DB_PATH,
    entities: [Settings, Sentence, App],
    synchronize: true, // Auto-create tables
  });

  console.log("✅ Created test database\n");

  const settingsRepo = connection.manager.getRepository(Settings);
  const sentencesRepo = connection.manager.getRepository(Sentence);
  const appRepo = connection.manager.getRepository(App);

  // Create settings
  const settings = settingsRepo.create({
    id: 0,
    includeUUID: true,
    uuid: uuidv4(),
    sentencesPerPage: 5,
    defaultToAllSelected: true,
    includeMetadata: true,
  });
  await settingsRepo.save(settings);
  console.log("✅ Created settings");

  // Import from Grid3
  console.log("\n📥 Importing from Grid3...");
  const grid = new Grid({
    name: EPossibleSources.Grid,
    staticLocations: [GRID_PATH],
    gridRootDirectories: [],
  });

  const text = await grid.getText();
  const metadataMap = await grid.getPhrasesWithMetadata();

  console.log(`   Text length: ${text.length} characters`);
  console.log(`   Metadata entries: ${metadataMap.size}`);

  const allSentences = getSentences(text).filter((s) => s.trim() !== "");
  const uniqueSentences = Array.from(new Set(allSentences));

  console.log(`   Total sentences: ${allSentences.length}`);
  console.log(`   Unique sentences: ${uniqueSentences.length}`);

  const sentencesInChunks = chunk(uniqueSentences, 50);

  for (const chunk of sentencesInChunks) {
    await connection
      .createQueryBuilder()
      .insert()
      .into(Sentence)
      .values(
        chunk.map((s) => {
          const metadata = metadataMap?.get(s);
          return {
            uuid: uuidv4(),
            createdAt: new Date(),
            submitted: false,
            viewed: false,
            content: s,
            source: EPossibleSources.Grid,
            metadata: metadata ? JSON.stringify(metadata) : undefined,
          };
        })
      )
      .execute();
  }

  console.log("✅ Imported sentences to database\n");

  // Export
  console.log("📤 Exporting...");
  const sentences = await sentencesRepo.find();

  const exportData = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    encryption: "none",
    sentenceCount: sentences.length,
    sentences: sentences.map((s) => ({
      uuid: s.uuid,
      anonymousUUID: settings.uuid,
      content: s.content,
      metadata: s.metadata ? JSON.parse(s.metadata) : undefined,
      source: s.source,
    })),
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(exportData, null, 2));

  console.log(`✅ Exported ${sentences.length} sentences to ${OUTPUT_PATH}\n`);

  // Show some stats
  const withMetadata = sentences.filter((s) => s.metadata).length;
  const withNewlines = sentences.filter((s) => s.content.includes("\n")).length;

  console.log("📊 Stats:");
  console.log(`   Total sentences: ${sentences.length}`);
  console.log(`   With metadata: ${withMetadata}`);
  console.log(`   With newlines: ${withNewlines}`);

  // Show example with newlines if any
  if (withNewlines > 0) {
    const example = sentences.find((s) => s.content.includes("\n"));
    console.log(`\n⚠️  Example with newline:`);
    console.log(`   Content: "${example?.content}"`);
    console.log(`   Has metadata: ${!!example?.metadata}`);
  }

  await connection.close();
  console.log("\n✅ Done!");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
