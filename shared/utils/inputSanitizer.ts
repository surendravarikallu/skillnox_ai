export interface SanitizerConfig {
  stripHTML?: boolean;
  stripSQL?: boolean;
  maxLength?: number;
}

export function sanitizeInput(input: string, config: SanitizerConfig = {}): string {
  if (!input) return '';
  let cleaned = input;
  if (config.stripHTML !== false) {
    cleaned = cleaned.replace(/<[^>]*>/g, '');
  }
  if (config.maxLength) {
    cleaned = cleaned.substring(0, config.maxLength);
  }
  return cleaned;
}
