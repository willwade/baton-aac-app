// Yes, a lot of this is duplicated.
// See: https://github.com/vercel/next.js/issues/706

export interface IPhraseMetadata {
  timestamp: number; // .NET ticks or Unix timestamp
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
 * Format metadata for display in UI
 */
export function formatMetadataForDisplay(metadata?: IPhraseMetadata[]): {
  count: number;
  firstSaid?: Date;
  lastSaid?: Date;
  hasGPS: boolean;
} {
  if (!metadata || metadata.length === 0) {
    return { count: 0, hasGPS: false };
  }

  const dates = metadata.map((m) => dotNetTicksToDate(m.timestamp));
  const hasGPS = metadata.some(
    (m) => m.latitude !== null || m.longitude !== null
  );

  return {
    count: metadata.length,
    firstSaid: new Date(Math.min(...dates.map((d) => d.getTime()))),
    lastSaid: new Date(Math.max(...dates.map((d) => d.getTime()))),
    hasGPS,
  };
}

export interface ISentence {
  uuid: string;
  createdAt: number;
  submitted: boolean;
  viewed: boolean;
  content: string;
  metadata?: IPhraseMetadata[];
  source?: string;
}

export interface IStats {
  totalSentences: number;
  submittedSentences: number;
  unviewedSentences: number;
}

export interface ISettings {
  id: number;
  includeUUID: boolean;
  uuid: string;
  defaultToAllSelected: boolean;
  sentencesPerPage: number;
  includeMetadata: boolean;
}

export interface IApp {
  id: number;
  name: string;
  path: string;
  hash: string;
  updatedAt: Date;
}

export enum EPossibleSources {
  Dasher = "Dasher",
  PlainText = "Plain Text",
  NewlineSeparatedPlainText = "Newline Separated Plain Text",
  Grid = "Grid",
  Communicator = "Tobii Communicator",
  Predictable = "Predictable",
}
