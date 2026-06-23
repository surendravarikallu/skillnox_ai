import { exportTranscript } from './transcriptExporter';

describe('Transcript Exporter', () => {
  const mockSegments = [
    { speaker: 'Interviewer', timestamp: '00:01', text: 'Welcome to the interview.' },
    { speaker: 'Candidate', timestamp: '00:05', text: 'Thank you.' }
  ];

  it('should export to markdown format', () => {
    const md = exportTranscript(mockSegments, { format: 'markdown' });
    expect(md).toContain('**[00:01] Interviewer:** Welcome to the interview.');
  });

  it('should export to HTML format', () => {
    const html = exportTranscript(mockSegments, { format: 'html' });
    expect(html).toContain('<div class="transcript">');
  });
});
