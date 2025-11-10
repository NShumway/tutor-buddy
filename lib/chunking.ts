import { encode } from 'gpt-tokenizer';

export interface TextChunk {
  text: string;
  index: number;
  token_count: number;
}

/**
 * Splits text into chunks of approximately chunkSize tokens
 * with overlapSize tokens overlapping between chunks.
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlapSize: number = 50
): TextChunk[] {
  // Split into sentences (simple approach)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  const chunks: TextChunk[] = [];
  let currentChunk: string[] = [];
  let currentTokenCount = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceTokens = encode(sentence).length;

    // If adding this sentence exceeds chunk size, save current chunk
    if (currentTokenCount + sentenceTokens > chunkSize && currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ').trim();
      chunks.push({
        text: chunkText,
        index: chunkIndex++,
        token_count: currentTokenCount,
      });

      // Keep last few sentences for overlap
      const overlapSentences: string[] = [];
      let overlapTokens = 0;
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        const tokens = encode(currentChunk[i]).length;
        if (overlapTokens + tokens <= overlapSize) {
          overlapSentences.unshift(currentChunk[i]);
          overlapTokens += tokens;
        } else {
          break;
        }
      }

      currentChunk = overlapSentences;
      currentTokenCount = overlapTokens;
    }

    currentChunk.push(sentence);
    currentTokenCount += sentenceTokens;
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.join(' ').trim(),
      index: chunkIndex,
      token_count: currentTokenCount,
    });
  }

  return chunks;
}
