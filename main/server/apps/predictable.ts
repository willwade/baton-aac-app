import { PredictableHistory } from "./types";

export const processPredictableFile = (buff: Buffer): string => {
  const parsedBuffer: PredictableHistory = JSON.parse(buff.toString());

  return parsedBuffer.RecordedMessages.map((message) =>
    message.Transcription.Text.trim()
  ).join("\n");
};
