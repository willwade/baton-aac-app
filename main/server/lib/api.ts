import got, { Got } from "got";

export interface IPhraseMetadata {
  timestamp: number;
  latitude: number | null;
  longitude: number | null;
}

export interface IPhraseMetadataExport {
  timestamp: string; // ISO 8601 format
  latitude: number | null;
  longitude: number | null;
}

/**
 * Convert .NET ticks to JavaScript Date
 * .NET ticks are 100-nanosecond intervals since 0001-01-01 00:00:00
 */
export function dotNetTicksToDate(ticks: number): Date {
  const epochTicks = 621355968000000000; // Ticks at Unix epoch (1970-01-01)
  const ticksPerMillisecond = 10000;
  const milliseconds = (ticks - epochTicks) / ticksPerMillisecond;
  return new Date(milliseconds);
}

/**
 * Convert metadata with .NET ticks to ISO date strings for export
 */
export function convertMetadataForExport(
  metadata: IPhraseMetadata[]
): IPhraseMetadataExport[] {
  return metadata.map((m) => ({
    timestamp: dotNetTicksToDate(m.timestamp).toISOString(),
    latitude: m.latitude,
    longitude: m.longitude,
  }));
}

export interface ISentenceDto {
  content: string;
  anonymousUUID: string | null;
  uuid: string;
  metadata?: IPhraseMetadataExport[]; // ISO dates for export
  source?: string;
}

export default class APIClient {
  private client: Got;

  constructor() {
    this.client = got.extend({ prefixUrl: process.env.BASE_API_URL });
  }

  async submitSentences(sentences: ISentenceDto[]) {
    await this.client.post("sentences/many", { json: sentences });
  }

  async deleteSentence(uuid: string) {
    await this.client.delete(`sentences/${uuid}`);
  }

  async getPublicKey() {
    const { body } = await this.client.get("keys/public");

    return body;
  }

  async putUserDetails(body: { uuid: string; encryptedData: string }) {
    await this.client.post("user-details", { json: body });
  }

  async checkUnlockCode(code: string) {
    return this.client.get(`codes/validate/${code}`);
  }
}
