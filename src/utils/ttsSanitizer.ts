/**
 * Sanitizes markdown and URLs before sending text to speech synthesis.
 * Ensures SUBBU never spells out "https://..." or speaks markdown asterisks.
 */
export function sanitizeTextForTTS(text: string): string {
  if (!text) return '';

  let clean = text;

  // 1. Remove code blocks
  clean = clean.replace(/```[\s\S]*?```/g, ' code block omitted. ');
  clean = clean.replace(/`([^`]+)`/g, '$1');

  // 2. Remove markdown images and links
  clean = clean.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');
  clean = clean.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // 3. Remove raw URLs
  clean = clean.replace(/https?:\/\/[^\s]+/g, ' a web link ');

  // 4. Remove headers, bullet points, blockquotes
  clean = clean.replace(/^[#*>-]+\s+/gm, '');

  // 5. Remove bold, italic, strikethrough markers
  clean = clean.replace(/[*_~]{1,3}/g, '');

  // 6. Remove HTML tags
  clean = clean.replace(/<[^>]*>/g, '');

  // 7. Normalize extra whitespace
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

