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

export function exportToHTML(segments: TranscriptSegment[]): string {
  let html = '<div class="transcript">\n';
  segments.forEach(seg => {
    html += `  <p><strong>[${seg.timestamp}] ${seg.speaker}:</strong> ${seg.text}</p>\n`;
  });
  html += '</div>';
  return html;
}

export function exportTranscript(segments: TranscriptSegment[], options: ExportOptions = {}): string {
  const format = options.format || 'markdown';
  if (format === 'json') return JSON.stringify(segments, null, 2);
  if (format === 'html') return exportToHTML(segments);
  return exportToMarkdown(segments, options);
}
