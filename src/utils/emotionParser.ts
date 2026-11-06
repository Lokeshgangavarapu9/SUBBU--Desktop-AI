import { SubbuExpression } from '../types/character';

const EMOTION_REGEX = /^\[(happy|excited|curious|thinking|confused|sad|surprised|sleepy|smiling|neutral|listening)\]/i;

export interface ParsedEmotionResult {
  emotion: SubbuExpression | null;
  cleanText: string;
}

/**
 * Extracts leading [emotion] tag from text stream and returns clean display text.
 */
export function parseEmotionTag(text: string): ParsedEmotionResult {
  const match = text.match(EMOTION_REGEX);
  if (match && match[1]) {
    const rawTag = match[1].toLowerCase() as SubbuExpression;
    const clean = text.replace(EMOTION_REGEX, '').trimStart();
    return {
      emotion: rawTag,
      cleanText: clean,
    };
  }

  return {
    emotion: null,
    cleanText: text,
  };
}

/**
 * Strips unspoken `<think>...</think>` internal reasoning blocks from text.
 */
export function extractThoughtBlocks(text: string): { display: string; thoughts: string[] } {
  const thoughts: string[] = [];
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  
  let match: RegExpExecArray | null;
  while ((match = thinkRegex.exec(text)) !== null) {
    if (match[1]?.trim()) {
      thoughts.push(match[1].trim());
    }
  }

  // Remove full think tags from visible text
  let display = text.replace(thinkRegex, '').trim();

  // If there's an unclosed `<think>` at the end of streaming text
  const unclosedIdx = display.indexOf('<think>');
  if (unclosedIdx !== -1) {
    const remainingThought = display.substring(unclosedIdx + 7).trim();
    if (remainingThought) {
      thoughts.push(remainingThought);
    }
    display = display.substring(0, unclosedIdx).trim();
  }

  return { display, thoughts };
}

