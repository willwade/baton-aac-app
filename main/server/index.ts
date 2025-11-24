import { ipcMain, dialog } from "electron";
import { v4 as uuidv4 } from "uuid";
import chunk from "chunk";
import { getDBConnection, deleteDB, Settings, Sentence, App } from "./models";
import apps, { appFactory } from "./apps";
import { getSentences } from "./lib/nlp";
import { EPossibleSources } from "./apps/types";
import { Connection, In, Like, Not } from "typeorm";
import sodium from "libsodium-wrappers";
import fs from "fs";
import {
  ISentenceDto,
  convertMetadataForExport,
  dotNetTicksToDate,
} from "./lib/api";

let LOCAL_ENCRYPTION_KEY: Uint8Array;
const EXPORT_ENCRYPTION_DISABLED =
  process.env.BATON_DISABLE_EXPORT_ENCRYPTION === "true";

const getInstalledApps = async () => {
  const installedApps = [];

  if (await apps.dasher.doesExist()) {
    installedApps.push(apps.dasher);
  }

  if (await apps.grid.doesExist()) {
    installedApps.push(apps.grid);
  }

  return installedApps;
};

const refreshDataFromAllApps = async (
  connection: Connection,
  {
    force = false,
    firstTime = false,
    appFilter = [],
  }: { force?: boolean; firstTime?: boolean; appFilter?: number[] } = {}
) => {
  const appRepo = connection.manager.getRepository(App);
  const sentencesRepo = connection.manager.getRepository(Sentence);

  const installedApps = await appRepo.find();

  await Promise.all(
    installedApps
      .filter((a) => (appFilter.length > 0 ? appFilter.includes(a.id) : true))
      .map(async (appModel) => {
        const thisApp = appFactory(appModel);

        const currentHash = await thisApp.getHash();

        if (currentHash !== appModel.hash || force) {
          // Update
          const text = await thisApp.getText();

          // Check if this is a Grid app with metadata support
          const isGridApp = appModel.name === "Grid";
          let metadataMap: Map<string, any[]> | undefined;

          if (isGridApp && "getPhrasesWithMetadata" in thisApp) {
            try {
              metadataMap = await (thisApp as any).getPhrasesWithMetadata();
            } catch (error) {
              console.error("Failed to get Grid metadata:", error);
            }
          }

          if (firstTime) {
            // Get all sentences and deduplicate them
            const allSentences = getSentences(text).filter(
              (s) => s.trim() !== ""
            );

            // Deduplicate: keep only unique phrases
            const uniqueSentences = Array.from(new Set(allSentences));

            const sentencesInChunks = chunk(uniqueSentences, 50);

            // Can't use Promise.all, since insert order (therefore createdAt date) would be non-deterministic
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
                      source: appModel.name,
                      metadata: metadata ? JSON.stringify(metadata) : undefined,
                    };
                  })
                )
                .execute();
            }
          } else {
            // It's assumed that there's not going to be much new data when updating
            const sentences = getSentences(text).reverse();

            let seenDuplicateSentences = 0;

            for (const sentence of sentences) {
              // Don't add blank sentences
              if (sentence.trim() === "") {
                continue;
              }

              if (seenDuplicateSentences > 5) {
                // Probably past the new data
                break;
              }

              const existingSentence = await sentencesRepo.findOne({
                where: { content: sentence },
              });

              if (existingSentence) {
                seenDuplicateSentences++;
                continue;
              } else {
                const metadata = metadataMap?.get(sentence);
                const s = sentencesRepo.create({
                  uuid: uuidv4(),
                  createdAt: new Date(),
                  submitted: false,
                  viewed: false,
                  content: sentence,
                  source: appModel.name,
                  metadata: metadata ? JSON.stringify(metadata) : undefined,
                });

                await sentencesRepo.save(s);
              }
            }
          }

          appModel.hash = await thisApp.getHash();
          appModel.updatedAt = new Date();
          await appRepo.save(appModel);
        }
      })
  );
};

export const registerIPCHandlers = async (): Promise<void> => {
  const connection = await getDBConnection();

  const sentencesRepo = connection.manager.getRepository(Sentence);
  const settingsRepo = connection.manager.getRepository(Settings);
  const appRepo = connection.manager.getRepository(App);

  // Generate local encryption key pair for local-only encryption
  await sodium.ready;
  const keyPair = sodium.crypto_box_keypair();
  LOCAL_ENCRYPTION_KEY = keyPair.publicKey;

  // Store the private key for potential future decryption (optional)
  // For now, we'll just use the public key for sealed box encryption

  ipcMain.handle("is-first-open", async () => {
    const settings = await connection.manager.findOne(Settings);

    return settings === undefined;
  });

  ipcMain.handle(
    "create-settings",
    async (_, { includeId }: { includeId: boolean }) => {
      const settings = settingsRepo.create({
        id: 0,
        includeUUID: includeId,
        uuid: uuidv4(),
        sentencesPerPage: 5,
        defaultToAllSelected: false,
        includeMetadata: false,
      });

      await settingsRepo.save(settings);
    }
  );

  ipcMain.handle("get-settings", async () => {
    return connection.manager.findOne(Settings);
  });

  ipcMain.handle("get-installed-apps", async () => {
    return (await getInstalledApps()).map((app) => app.getName());
  });

  ipcMain.handle("import-from-installed-apps", async () => {
    const installedApps = await getInstalledApps();

    await Promise.all(
      installedApps.map(async (app) => {
        const newApp = appRepo.create({
          name: app.getName(),
          path: await app.getPath(),
          hash: await app.getHash(),
          updatedAt: new Date(),
        });

        await appRepo.save(newApp);
      })
    );

    await refreshDataFromAllApps(connection, { force: true, firstTime: true });
  });

  ipcMain.handle(
    "get-sentence-batch",
    async (
      _,
      {
        size,
        searchTerm,
        searchMode,
        startDate,
        endDate,
      }: {
        size: number;
        searchTerm?: string;
        searchMode?: "include" | "exclude";
        startDate?: string; // ISO date string
        endDate?: string; // ISO date string
      }
    ) => {
      const where: any = {
        submitted: false,
        viewed: false,
      };

      // Add search filter if provided
      if (searchTerm && searchTerm.trim() !== "") {
        if (searchMode === "exclude") {
          where.content = Not(Like(`%${searchTerm}%`));
        } else {
          // Default to include
          where.content = Like(`%${searchTerm}%`);
        }
      }

      let sentences = await sentencesRepo.find({
        where,
        order: {
          createdAt: "DESC",
        },
        take: size * 10, // Get more to filter by date
      });

      // Filter by date range if provided (metadata-based filtering)
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        sentences = sentences.filter((s) => {
          if (!s.metadata) return false;

          try {
            const metadata = JSON.parse(s.metadata);
            return metadata.some((m: any) => {
              const date = dotNetTicksToDate(m.timestamp);
              if (start && date < start) return false;
              if (end && date > end) return false;
              return true;
            });
          } catch {
            return false;
          }
        });
      }

      // Limit to requested size after filtering
      const limitedSentences = sentences.slice(0, size);

      // Parse metadata JSON strings to objects for frontend
      return limitedSentences.map((s) => {
        if (s.metadata) {
          try {
            return {
              ...s,
              metadata: JSON.parse(s.metadata),
            };
          } catch {
            // If parsing fails, return without metadata
            return {
              ...s,
              metadata: undefined,
            };
          }
        }
        return s;
      });
    }
  );

  ipcMain.handle(
    "get-all-unviewed-sentence-uuids",
    async (
      _,
      {
        searchTerm,
        searchMode,
        startDate,
        endDate,
      }: {
        searchTerm?: string;
        searchMode?: "include" | "exclude";
        startDate?: string;
        endDate?: string;
      } = {}
    ) => {
      const where: any = {
        submitted: false,
        viewed: false,
      };

      // Add search filter if provided
      if (searchTerm && searchTerm.trim() !== "") {
        if (searchMode === "exclude") {
          where.content = Not(Like(`%${searchTerm}%`));
        } else {
          // Default to include
          where.content = Like(`%${searchTerm}%`);
        }
      }

      let sentences = await sentencesRepo.find({
        where,
        select: ["uuid", "metadata"],
      });

      // Filter by date range if provided
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        sentences = sentences.filter((s) => {
          if (!s.metadata) return false;

          try {
            const metadata = JSON.parse(s.metadata);
            return metadata.some((m: any) => {
              const date = dotNetTicksToDate(m.timestamp);
              if (start && date < start) return false;
              if (end && date > end) return false;
              return true;
            });
          } catch {
            return false;
          }
        });
      }

      return sentences.map((s) => s.uuid);
    }
  );

  ipcMain.handle(
    "get-submitted-sentences",
    async (_, { offset, limit }: { offset: number; limit: number }) => {
      return sentencesRepo.find({
        where: {
          submitted: true,
        },
        order: {
          createdAt: "DESC",
        },
        take: limit,
        skip: offset,
      });
    }
  );

  ipcMain.handle(
    "submit-sentences-by-uuids",
    async (_, { uuids }: { uuids: string[] }) => {
      // Just mark as submitted - no backend upload
      await connection
        .createQueryBuilder()
        .update(Sentence)
        .where("sentence.uuid IN (:...uuids)", { uuids })
        .set({ submitted: true })
        .execute();
    }
  );

  ipcMain.handle(
    "export-sentences-to-file",
    async (_, { uuids }: { uuids: string[] }) => {
      const settings = await connection.manager.findOne(Settings);

      if (!settings) {
        throw new Error("Missing settings");
      }

      // Get sentences
      const sentences = await sentencesRepo.find({
        where: {
          uuid: In(uuids),
        },
      });

      await sodium.ready;

      const encryptedSentences: ISentenceDto[] = sentences.map((s) => {
        const dto: ISentenceDto = {
          uuid: s.uuid,
          anonymousUUID: settings.includeUUID ? settings.uuid : null,
          content: EXPORT_ENCRYPTION_DISABLED
            ? s.content
            : Buffer.from(
                sodium.crypto_box_seal(s.content, LOCAL_ENCRYPTION_KEY)
              ).toString("base64"),
        };

        // Include metadata if setting is enabled and metadata exists
        if (settings.includeMetadata && s.metadata) {
          try {
            const parsedMetadata = JSON.parse(s.metadata);
            // Convert .NET ticks to ISO date strings
            dto.metadata = convertMetadataForExport(parsedMetadata);
          } catch (error) {
            console.error("Failed to parse metadata for sentence:", s.uuid);
          }
        }

        // Include source if metadata is enabled
        if (settings.includeMetadata && s.source) {
          dto.source = s.source;
        }

        return dto;
      });

      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: "Export Encrypted Phrases",
        defaultPath: `baton-export-${
          new Date().toISOString().split("T")[0]
        }.json`,
        filters: [
          { name: "JSON Files", extensions: ["json"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (result.canceled || !result.filePath) {
        throw new Error("Export cancelled");
      }

      // Write encrypted data to file
      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        encryption: EXPORT_ENCRYPTION_DISABLED
          ? "none"
          : "libsodium-sealed-box+base64",
        sentenceCount: encryptedSentences.length,
        sentences: encryptedSentences,
      };

      await fs.promises.writeFile(
        result.filePath,
        JSON.stringify(exportData, null, 2),
        "utf-8"
      );

      // Mark as submitted after successful export
      await connection
        .createQueryBuilder()
        .update(Sentence)
        .where("sentence.uuid IN (:...uuids)", { uuids })
        .set({ submitted: true })
        .execute();

      return result.filePath;
    }
  );

  ipcMain.handle(
    "mark-sentences-as-viewed-by-uuids",
    async (_, { uuids }: { uuids: string[] }) => {
      await connection
        .createQueryBuilder()
        .update(Sentence)
        .where("sentence.uuid IN (:...uuids)", { uuids })
        .set({ viewed: true })
        .execute();
    }
  );

  ipcMain.handle("get-stats", async () => {
    const [totalSentences, submittedSentences, unviewedSentences] =
      await Promise.all([
        sentencesRepo.count(),
        sentencesRepo.count({
          where: { submitted: true },
        }),
        sentencesRepo.count({
          where: { viewed: false },
        }),
      ]);

    return { totalSentences, submittedSentences, unviewedSentences };
  });

  ipcMain.handle(
    "delete-submitted-sentence",
    async (_, { uuid }: { uuid: string }) => {
      // Just mark as not submitted locally - no backend deletion needed
      await sentencesRepo.update(uuid, { submitted: false });
    }
  );

  ipcMain.handle("delete-all-local-data", async () => {
    await connection.close();

    await deleteDB();

    // Refresh connection
    await connection.connect();
  });

  ipcMain.handle("put-settings", async (_, newSettings: Partial<Sentence>) => {
    const settings = await settingsRepo.findOne();

    if (!settings) {
      throw new Error("No existing settings found");
    }

    await settingsRepo.update(settings.id, newSettings);
  });

  ipcMain.handle("refresh-data", async () => {
    await refreshDataFromAllApps(connection);
  });

  ipcMain.handle("get-sources", async () => {
    return appRepo.find();
  });

  ipcMain.handle(
    "add-source",
    async (_, { name, path }: { name: EPossibleSources; path: string }) => {
      const app = appFactory({ name, path });

      const newApp = appRepo.create({
        name,
        path: await app.getPath(),
        hash: "",
        updatedAt: new Date(),
      });

      await appRepo.save(newApp);

      await refreshDataFromAllApps(connection, {
        firstTime: true,
        appFilter: [newApp.id],
      });
    }
  );

  ipcMain.handle("delete-source", async (_, id: number) => {
    const app = await appRepo.findOne({ where: { id } });

    if (app) {
      await appRepo.remove(app);
    } else {
      throw new Error(`App with ID ${id} does not exist.`);
    }
  });

  ipcMain.handle("get-possible-new-sources", async () => {
    const possible: EPossibleSources[] = [
      EPossibleSources.PlainText,
      EPossibleSources.NewlineSeparatedPlainText,
      EPossibleSources.Communicator,
      EPossibleSources.Predictable,
    ];

    const apps = await appRepo.find();

    if (!apps.find((a) => a.name === "Dasher")) {
      const dasher = appFactory({ name: EPossibleSources.Dasher, path: "" });
      if (await dasher.doesExist()) {
        possible.push(EPossibleSources.Dasher);
      }
    }

    if (!apps.find((a) => a.name === "Grid")) {
      const grid = appFactory({ name: EPossibleSources.Grid, path: "" });
      if (await grid.doesExist()) {
        possible.push(EPossibleSources.Grid);
      }
    }

    return possible;
  });

  // Removed upload-user-details and check-unlock-code handlers
  // as we're doing local-only export now
};
