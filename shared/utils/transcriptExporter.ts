export interface TranscriptSegment {
  speaker: string;
  timestamp: string;
  text: string;
}

export interface ExportOptions {
  includeMetadata?: boolean;
  format?: 'markdown' | 'json' | 'html';
}

export function exportToMarkdown(segments: TranscriptSegment[], options: ExportOptions = {}): string {
  let md = '';
  if (options.includeMetadata) {
    md += `# Interview Transcript\n\nGenerated on: ${new Date().toISOString()}\n\n---\n\n`;
  }
  segments.forEach(seg => {
    md += `**[${seg.timestamp}] ${seg.speaker}:** ${seg.text}\n\n`;
  });
  return md;
}
