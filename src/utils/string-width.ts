/**
 * Calculate the visual width of a string in terminal
 * Handles multi-byte characters (CJK, emoji, etc.)
 */
export function stringWidth(str: string): number {
  if (!str || str.length === 0) return 0;

  let width = 0;
  const chars = [...str]; // Use spread to handle surrogate pairs correctly

  for (const char of chars) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;

    // Control characters (but not space)
    if ((code <= 0x1f && code !== 0x20) || (code >= 0x7f && code <= 0x9f)) {
      continue;
    }

    // Combining marks (zero width)
    if (code >= 0x300 && code <= 0x36f) {
      continue;
    }

    // Check for full-width characters
    if (isFullWidth(code)) {
      width += 2;
    } else {
      width += 1;
    }
  }

  return width;
}

/**
 * Check if a character is full-width (takes 2 columns in terminal)
 * Based on East Asian Width property
 */
function isFullWidth(code: number): boolean {
  // CJK ideographs
  if (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0x20000 && code <= 0x2a6df) || // CJK Extension B
    (code >= 0x2a700 && code <= 0x2b73f) || // CJK Extension C
    (code >= 0x2b740 && code <= 0x2b81f) || // CJK Extension D
    (code >= 0x2b820 && code <= 0x2ceaf) || // CJK Extension E
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0x2f800 && code <= 0x2fa1f) // CJK Compatibility Supplement
  ) {
    return true;
  }

  // Hangul
  if (
    (code >= 0x1100 && code <= 0x11ff) || // Hangul Jamo
    (code >= 0xac00 && code <= 0xd7af) || // Hangul Syllables
    (code >= 0xa960 && code <= 0xa97f) || // Hangul Jamo Extended-A
    (code >= 0xd7b0 && code <= 0xd7ff) // Hangul Jamo Extended-B
  ) {
    return true;
  }

  // Kana
  if (
    (code >= 0x3040 && code <= 0x309f) || // Hiragana
    (code >= 0x30a0 && code <= 0x30ff) // Katakana
  ) {
    return true;
  }

  // Full-width ASCII variants
  if (code >= 0xff01 && code <= 0xff60) {
    return true;
  }

  // Full-width brackets
  if (code >= 0xff61 && code <= 0xff9f) {
    return false; // Half-width katakana
  }

  // Other full-width characters
  if (
    code === 0x3000 || // Ideographic space
    (code >= 0x2e80 && code <= 0x2eff) || // CJK Radicals Supplement
    (code >= 0x3000 && code <= 0x303f) || // CJK Symbols and Punctuation
    (code >= 0x3200 && code <= 0x32ff) || // Enclosed CJK Letters and Months
    (code >= 0xfe10 && code <= 0xfe1f) || // Vertical forms
    (code >= 0xfe30 && code <= 0xfe4f) || // CJK Compatibility Forms
    (code >= 0xfe50 && code <= 0xfe6f) // Small Form Variants
  ) {
    return true;
  }

  // Most emoji are full-width
  if (code >= 0x1f300 && code <= 0x1f9ff) {
    return true;
  }

  return false;
}

/**
 * Truncate a string to fit within a specified visual width
 * @param str The string to truncate
 * @param maxWidth Maximum visual width
 * @param ellipsis The ellipsis string (default: "...")
 * @returns Truncated string with ellipsis if needed
 */
export function truncateString(
  str: string,
  maxWidth: number,
  ellipsis = "...",
): string {
  if (!str || maxWidth <= 0) return "";

  const fullWidth = stringWidth(str);
  if (fullWidth <= maxWidth) return str;

  const ellipsisWidth = stringWidth(ellipsis);
  if (maxWidth <= ellipsisWidth) return ellipsis.substring(0, maxWidth);

  const targetWidth = maxWidth - ellipsisWidth;
  let currentWidth = 0;
  let result = "";
  const chars = [...str];

  for (const char of chars) {
    const charWidth = stringWidth(char);
    if (currentWidth + charWidth > targetWidth) {
      break;
    }
    result += char;
    currentWidth += charWidth;
  }

  return result + ellipsis;
}

/**
 * Pad a string to a specific visual width
 * @param str The string to pad
 * @param targetWidth Target visual width
 * @param fillChar Character to use for padding (default: space)
 * @returns Padded string
 */
export function padEnd(
  str: string,
  targetWidth: number,
  fillChar = " ",
): string {
  const currentWidth = stringWidth(str);
  if (currentWidth >= targetWidth) return str;

  const fillWidth = stringWidth(fillChar);
  const remainingWidth = targetWidth - currentWidth;
  const fillCount = Math.floor(remainingWidth / fillWidth);

  return str + fillChar.repeat(fillCount);
}
