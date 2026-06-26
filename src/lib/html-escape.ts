/**
 * Encodes the five characters that have special meaning in HTML/XML.
 * Use before interpolating user-supplied strings into HTML email bodies or
 * any other HTML context that isn't managed by a sanitising template engine.
 */
export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
