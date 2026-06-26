import { describe, it, expect } from "vitest";
import { escHtml } from "@/lib/html-escape";

describe("escHtml", () => {
  it("returns plain text unchanged", () => {
    expect(escHtml("Hello World")).toBe("Hello World");
  });

  it("escapes ampersands", () => {
    expect(escHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("escapes angle brackets", () => {
    expect(escHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });

  it("escapes double quotes", () => {
    expect(escHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escHtml("it's fine")).toBe("it&#39;s fine");
  });

  it("escapes a full HTML-injection payload", () => {
    const payload = '</strong><script>alert("xss")</script>';
    const result = escHtml(payload);
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    expect(result).toContain("&quot;");
  });

  it("handles empty string", () => {
    expect(escHtml("")).toBe("");
  });

  it("handles a string with no special characters", () => {
    expect(escHtml("Paris 2026")).toBe("Paris 2026");
  });

  it("escapes multiple occurrences of the same character", () => {
    expect(escHtml("a & b & c")).toBe("a &amp; b &amp; c");
  });
});
