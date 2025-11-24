import fs from "fs";
import sqlite3 from "sqlite3";
import path from "path";
import { getHashFromFile, hashString } from "../lib/hash";
import { AAppDataGetters, EPossibleSources } from "./types";
import { addEndMarkerToPhrase } from "../lib/add-end-marker-to-phrase";

interface DatabaseRow {
  Text: string;
}

interface PhraseHistoryRow {
  Text: string;
  Timestamp: number;
  Latitude: number | null;
  Longitude: number | null;
}

export interface GridPhraseMetadata {
  timestamp: number; // .NET ticks
  latitude: number | null;
  longitude: number | null;
}

class Grid extends AAppDataGetters {
  private name: EPossibleSources = EPossibleSources.Grid;
  private staticLocations: string[];
  private gridRootDirectories: string[];
  private validLocations?: string[];

  constructor({
    name,
    staticLocations,
    gridRootDirectories,
  }: {
    name?: EPossibleSources;
    staticLocations: string[];
    gridRootDirectories: string[];
  }) {
    super();

    if (name) {
      this.name = name;
    }

    this.staticLocations = staticLocations;
    this.gridRootDirectories = gridRootDirectories;
  }

  private async addValidStaticLocations(): Promise<string[]> {
    const validStaticLocations = [];

    for await (const location of this.staticLocations) {
      try {
        await fs.promises.access(location);

        validStaticLocations.push(location);
      } catch {}
    }

    return validStaticLocations;
  }

  /**
   * Goes through the potential grid roots and looks for sqlite files.
   * Each Grid 3 root can have any number of users, we return all the users that we find
   *
   * A Grid 3 folder has this structure:
   * /Grid 3
   *  /Users
   *    /first
   *      /en-GB
   *        /Phrases
   *          history.sqlite
   *    /second
   *      /en-GB
   *        /Phrases
   *          history.sqlite
   */
  private async addValidDynamicLocations(): Promise<string[]> {
    const validDynamicLocations: string[] = [];

    for await (const currentRoot of this.gridRootDirectories) {
      try {
        const userDirectory = path.join(currentRoot, "./Users");

        await fs.promises.access(userDirectory);

        const allFilesInUserDir = await fs.promises.readdir(userDirectory, {
          withFileTypes: true,
        });
        const users = allFilesInUserDir.filter((source) =>
          source.isDirectory()
        );

        for await (const currentUser of users) {
          const userHistory = path.join(
            userDirectory,
            currentUser.name,
            "./en-GB/Phrases/history.sqlite"
          );

          try {
            await fs.promises.access(userHistory);
            validDynamicLocations.push(userHistory);
          } catch {}
        }
      } catch {}
    }

    return validDynamicLocations;
  }

  private async getLocations(): Promise<string[]> {
    if (this.validLocations) {
      return this.validLocations;
    }

    const validDynamicLocations = await this.addValidDynamicLocations();
    const validStaticLocations = await this.addValidStaticLocations();

    this.validLocations = [...validDynamicLocations, ...validStaticLocations];

    return this.validLocations;
  }

  async doesExist() {
    try {
      const locations = await this.getLocations();
      return locations.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * We get the raw contents of all the files and hash them.
   *
   * We combine the hashes so that if any file changes we
   * re-fetch the text
   */
  async getHash() {
    const locations = await this.getLocations();
    const hashes = await Promise.all(
      locations.map(async (location) => await getHashFromFile(location))
    );
    const allHashes = hashes.join("");

    return hashString(allHashes);
  }

  async getText() {
    const locations = await this.getLocations();

    const phrases = await Promise.all(
      locations.map(async (location) => await this.getTextForLocation(location))
    );

    const sentences = phrases
      .flat()
      .map((phrase) => addEndMarkerToPhrase(phrase))
      // Replace newlines with spaces to prevent getSentences() from splitting multi-line phrases
      .map((phrase) => phrase.replace(/\n/g, " "));

    const rawPhrases = sentences.join("\n");

    return rawPhrases;
  }

  /**
   * Get phrases with metadata (timestamps, GPS coordinates)
   * Returns a map of phrase content to array of metadata (one per occurrence)
   */
  async getPhrasesWithMetadata(): Promise<Map<string, GridPhraseMetadata[]>> {
    const locations = await this.getLocations();

    const allPhraseData = await Promise.all(
      locations.map(
        async (location) => await this.getMetadataForLocation(location)
      )
    );

    // Combine all locations into a single map
    const combinedMap = new Map<string, GridPhraseMetadata[]>();

    for (const locationMap of allPhraseData) {
      for (const [phrase, metadata] of locationMap.entries()) {
        const existing = combinedMap.get(phrase) || [];
        combinedMap.set(phrase, [...existing, ...metadata]);
      }
    }

    return combinedMap;
  }

  /**
   * Queries the sqlite database given.
   *
   * Selects all UNIQUE phrases from the PhraseHistory table.
   *
   * Only takes phrases with a real timestamp. For some reason
   * every phrase exists in history once without a timestamp even
   * when its never been said
   */
  private async getTextForLocation(location: string): Promise<string[]> {
    const database = new sqlite3.Database(location);

    const databaseResult = (await new Promise((resolve, reject) => {
      database.all(
        `
        SELECT DISTINCT p.Text
        FROM PhraseHistory ph
        INNER JOIN Phrases p ON p.Id = ph.PhraseId
        WHERE "Timestamp" <> 0
      `,
        (err, result) => {
          if (err) return reject(err);

          resolve(result);
        }
      );
    })) as Array<DatabaseRow>;

    database.close();

    const phrases = databaseResult.map((result) => result.Text);

    return phrases;
  }

  /**
   * Get metadata for all phrases at a specific location
   * Returns a map of phrase content to array of metadata
   */
  private async getMetadataForLocation(
    location: string
  ): Promise<Map<string, GridPhraseMetadata[]>> {
    const database = new sqlite3.Database(location);

    const databaseResult = (await new Promise((resolve, reject) => {
      database.all(
        `
        SELECT p.Text, ph.Timestamp, ph.Latitude, ph.Longitude
        FROM PhraseHistory ph
        INNER JOIN Phrases p ON p.Id = ph.PhraseId
        WHERE ph.Timestamp <> 0
        ORDER BY ph.Timestamp ASC
      `,
        (err, result) => {
          if (err) return reject(err);

          resolve(result);
        }
      );
    })) as Array<PhraseHistoryRow>;

    database.close();

    // Group by phrase text
    const phraseMap = new Map<string, GridPhraseMetadata[]>();

    for (const row of databaseResult) {
      // Process phrase the same way as getText() does:
      // 1. Add end marker
      // 2. Replace newlines with spaces (to match how phrases are stored)
      const phrase = addEndMarkerToPhrase(row.Text).replace(/\n/g, " ");
      const metadata: GridPhraseMetadata = {
        timestamp: row.Timestamp,
        latitude: row.Latitude,
        longitude: row.Longitude,
      };

      const existing = phraseMap.get(phrase) || [];
      phraseMap.set(phrase, [...existing, metadata]);
    }

    return phraseMap;
  }

  getName() {
    return this.name;
  }

  /**
   * Join all the paths together as there is multiple paths
   */
  async getPath() {
    const locations = await this.getLocations();
    return locations.join(";");
  }
}

export default Grid;
