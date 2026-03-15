/**
 * Recursive text splitter for knowledge base ingestion.
 *
 * Splits text hierarchically: paragraphs → newlines → sentences → words,
 * targeting a configurable token budget per chunk with overlap.
 */

export interface TextChunk {
  content: string
  index: number
  tokenEstimate: number
  metadata: Record<string, unknown>
}

/**
 * Rough token estimator.  OpenAI models average ~4 characters per token for
 * English text.  This is intentionally fast (no tokenizer dependency).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ', ', ' ']

export class RecursiveTextSplitter {
  private readonly maxTokens: number
  private readonly overlap: number
  private readonly separators: string[]

  constructor(
    maxTokens = 512,
    overlap = 64,
    separators: string[] = DEFAULT_SEPARATORS,
  ) {
    this.maxTokens = maxTokens
    this.overlap = overlap
    this.separators = separators
  }

  /**
   * Split `text` into chunks that each fit within `maxTokens`.
   * Chunks overlap by `overlap` tokens for context continuity.
   */
  splitText(
    text: string,
    maxTokens?: number,
    overlap?: number,
  ): string[] {
    const effectiveMax = maxTokens ?? this.maxTokens
    const effectiveOverlap = overlap ?? this.overlap

    // Fast path — text already fits
    if (estimateTokens(text) <= effectiveMax) {
      return [text.trim()].filter(Boolean)
    }

    return this._splitRecursive(text, 0, effectiveMax, effectiveOverlap)
  }

  /**
   * Split text, then annotate each chunk with metadata including the original
   * section header (if any) so the LLM retains structural context.
   */
  createChunksWithContext(
    text: string,
    metadata: Record<string, unknown>,
  ): TextChunk[] {
    // Detect section headers (markdown-style or ALL-CAPS lines)
    const sections = this._splitIntoSections(text)
    const chunks: TextChunk[] = []
    let globalIndex = 0

    for (const section of sections) {
      const rawChunks = this.splitText(section.body)
      for (const raw of rawChunks) {
        const content = section.header
          ? `[Section: ${section.header}]\n${raw}`
          : raw
        chunks.push({
          content,
          index: globalIndex++,
          tokenEstimate: estimateTokens(content),
          metadata: {
            ...metadata,
            ...(section.header ? { sectionHeader: section.header } : {}),
          },
        })
      }
    }

    return chunks
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private _splitRecursive(
    text: string,
    separatorIndex: number,
    maxTokens: number,
    overlap: number,
  ): string[] {
    if (separatorIndex >= this.separators.length) {
      // Last resort: hard-split by character budget
      return this._hardSplit(text, maxTokens, overlap)
    }

    const separator = this.separators[separatorIndex]!
    const parts = text.split(separator).filter(Boolean)

    // If splitting produced nothing useful, try the next separator
    if (parts.length <= 1) {
      return this._splitRecursive(text, separatorIndex + 1, maxTokens, overlap)
    }

    const chunks: string[] = []
    let currentChunk = ''

    for (const part of parts) {
      const candidate = currentChunk
        ? currentChunk + separator + part
        : part

      if (estimateTokens(candidate) <= maxTokens) {
        currentChunk = candidate
      } else {
        // Current chunk is full — flush it
        if (currentChunk) {
          chunks.push(currentChunk.trim())
          // Calculate overlap: take tail of current chunk
          const overlapText = this._getOverlapTail(currentChunk, overlap)
          currentChunk = overlapText ? overlapText + separator + part : part
        } else {
          // Single part exceeds budget — recurse with finer separator
          const subChunks = this._splitRecursive(
            part,
            separatorIndex + 1,
            maxTokens,
            overlap,
          )
          chunks.push(...subChunks)
          currentChunk = ''
        }

        // Check if the new currentChunk itself exceeds budget
        if (currentChunk && estimateTokens(currentChunk) > maxTokens) {
          const subChunks = this._splitRecursive(
            currentChunk,
            separatorIndex + 1,
            maxTokens,
            overlap,
          )
          chunks.push(...subChunks.slice(0, -1))
          currentChunk = subChunks[subChunks.length - 1] ?? ''
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }

  /**
   * Hard character-based split when no separator works.
   */
  private _hardSplit(
    text: string,
    maxTokens: number,
    overlap: number,
  ): string[] {
    const maxChars = maxTokens * 4
    const overlapChars = overlap * 4
    const chunks: string[] = []
    let start = 0

    while (start < text.length) {
      const end = Math.min(start + maxChars, text.length)
      chunks.push(text.slice(start, end).trim())
      start = end - overlapChars
      if (start >= text.length) break
      // Prevent infinite loop
      if (end === text.length) break
    }

    return chunks.filter(Boolean)
  }

  /**
   * Get the last `overlapTokens` worth of text from a string.
   */
  private _getOverlapTail(text: string, overlapTokens: number): string {
    const overlapChars = overlapTokens * 4
    if (text.length <= overlapChars) return text
    return text.slice(-overlapChars)
  }

  /**
   * Heuristically split text into sections based on headers.
   */
  private _splitIntoSections(
    text: string,
  ): Array<{ header: string | null; body: string }> {
    const headerPattern = /^(?:#{1,4}\s+.+|[A-Z][A-Z\s]{4,}[A-Z])$/gm
    const sections: Array<{ header: string | null; body: string }> = []

    const matches: Array<{ index: number; header: string }> = []
    let match: RegExpExecArray | null
    while ((match = headerPattern.exec(text)) !== null) {
      matches.push({ index: match.index, header: match[0].replace(/^#+\s*/, '').trim() })
    }

    if (matches.length === 0) {
      return [{ header: null, body: text }]
    }

    // Text before first header
    if (matches[0]!.index > 0) {
      const preamble = text.slice(0, matches[0]!.index).trim()
      if (preamble) {
        sections.push({ header: null, body: preamble })
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i]!
      const nextIndex = i + 1 < matches.length ? matches[i + 1]!.index : text.length
      const body = text.slice(current.index + current.header.length, nextIndex).trim()
      if (body) {
        sections.push({ header: current.header, body })
      }
    }

    return sections
  }
}
