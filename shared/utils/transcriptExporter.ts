export interface TranscriptSegment {
  speaker: string;
  timestamp: string;
  text: string;
}

export interface ExportOptions {
  includeMetadata?: boolean;
  format?: 'markdown' | 'json' | 'html';
}
