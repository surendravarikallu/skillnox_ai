import { sanitizeInput } from './inputSanitizer';

describe('Input Sanitizer', () => {
  it('should strip out basic HTML tags', () => {
    const dirty = '<script>alert("xss")</script>Hello!';
    expect(sanitizeInput(dirty)).toBe('alert("xss")Hello!');
  });

  it('should enforce maximum length constraints', () => {
    expect(sanitizeInput('abcdef', { maxLength: 3 })).toBe('abc');
  });
});
