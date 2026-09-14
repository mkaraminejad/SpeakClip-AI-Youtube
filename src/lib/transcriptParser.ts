import { TranscriptSegment } from '../types';

/**
 * Parses time string formatted as HH:MM:SS,mmm or HH:MM:SS.mmm or MM:SS to seconds
 */
export function parseTimestampToSeconds(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const clean = timeStr.trim().replace(',', '.');
  const parts = clean.split(':');

  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return Number((hours * 3600 + minutes * 60 + seconds).toFixed(2));
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return Number((minutes * 60 + seconds).toFixed(2));
  }
  return parseFloat(clean) || 0;
}

/**
 * Parses SRT formatted subtitle text into TranscriptSegment array
 */
export function parseSrt(srtContent: string): TranscriptSegment[] {
  if (!srtContent || typeof srtContent !== 'string') return [];
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const blocks = normalized.split(/\n\s*\n/);
  const segments: TranscriptSegment[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    const lines = block.split('\n');
    let timeLine = '';
    let textLines: string[] = [];

    // Check if line 0 is a number index
    if (/^\d+$/.test(lines[0].trim()) && lines.length > 1) {
      timeLine = lines[1];
      textLines = lines.slice(2);
    } else {
      timeLine = lines[0];
      textLines = lines.slice(1);
    }

    if (!timeLine.includes('-->')) continue;

    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
    const start = parseTimestampToSeconds(startStr);
    const end = parseTimestampToSeconds(endStr);
    const text = textLines
      .join(' ')
      .replace(/<[^>]*>/g, '') // remove html tags
      .replace(/\{[^}]*\}/g, '') // remove subtitle formatting tags
      .trim();

    if (text) {
      const words = text.split(/\s+/).map((word, wIdx, arr) => {
        const wordDuration = (end - start) / Math.max(1, arr.length);
        return {
          word,
          start: Number((start + wIdx * wordDuration).toFixed(2)),
          end: Number((start + (wIdx + 1) * wordDuration).toFixed(2)),
        };
      });

      segments.push({
        id: `seg_${Date.now()}_${i + 1}`,
        start,
        end: end > start ? end : Number((start + 4.0).toFixed(2)),
        text,
        isSelectedForTeaching: true,
        words,
      });
    }
  }

  return segments;
}

/**
 * Parses WebVTT formatted subtitle text into TranscriptSegment array
 */
export function parseVtt(vttContent: string): TranscriptSegment[] {
  if (!vttContent || typeof vttContent !== 'string') return [];
  // Strip WEBVTT header
  const cleaned = vttContent
    .replace(/^WEBVTT[^\n]*\n+/i, '')
    .replace(/NOTE[^\n]*\n+/gi, '')
    .trim();

  return parseSrt(cleaned);
}

/**
 * Splits plain text into natural speech sentences with reasonable timestamps
 */
export function parsePlainTextToSegments(
  text: string,
  estimatedDuration: number = 120
): TranscriptSegment[] {
  if (!text || typeof text !== 'string' || !text.trim()) return [];

  // Match sentences ending in period, exclamation, or question mark, or newlines
  const rawSentences = text
    .replace(/([.?!])\s*(?=[A-Z0-9"'])/g, '$1|__SPLIT__|')
    .split('|__SPLIT__|')
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  if (rawSentences.length === 0) {
    rawSentences.push(text.trim());
  }

  const avgDuration = Math.max(3.5, Math.min(10, estimatedDuration / rawSentences.length));
  let currentStart = 1.0;

  return rawSentences.map((sentence, idx) => {
    const wordCount = sentence.split(/\s+/).length;
    const duration = Math.max(2.5, Number((wordCount * 0.42).toFixed(1)));
    const start = Number(currentStart.toFixed(1));
    const end = Number((start + duration).toFixed(1));
    currentStart = end + 0.8;

    const words = sentence.split(/\s+/).map((word, wIdx, arr) => {
      const step = duration / Math.max(1, arr.length);
      return {
        word,
        start: Number((start + wIdx * step).toFixed(2)),
        end: Number((start + (wIdx + 1) * step).toFixed(2)),
      };
    });

    return {
      id: `seg_${Date.now()}_${idx + 1}`,
      start,
      end,
      text: sentence,
      isSelectedForTeaching: true,
      words,
    };
  });
}

/**
 * Universal auto-detector and parser for any transcript input
 */
export function parseAnyTranscriptInput(
  rawInput: string,
  estimatedDuration: number = 120
): TranscriptSegment[] {
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  // 1. Detect VTT
  if (trimmed.startsWith('WEBVTT') || trimmed.includes('-->') && trimmed.includes('.')) {
    const segments = parseVtt(trimmed);
    if (segments.length > 0) return segments;
  }

  // 2. Detect SRT
  if (trimmed.includes('-->')) {
    const segments = parseSrt(trimmed);
    if (segments.length > 0) return segments;
  }

  // 3. Fallback to Plain Text
  return parsePlainTextToSegments(trimmed, estimatedDuration);
}
