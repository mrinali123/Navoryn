export function countNights(arrivalDate: string, departureDate: string): number {
  return Math.round(
    (new Date(departureDate).getTime() - new Date(arrivalDate).getTime()) / 86_400_000
  );
}

export function stripGroqJson(rawText: string): string | null {
  const stripped = rawText
    .replace(/```(?:json)?\n?/g, "")
    .replace(/```/g, "")
    .trim();

  // Greedy match from first { to last } — strips surrounding prose
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) return match[0];

  // No closing } means truncated JSON — return from { so repairJson can fix it
  const start = stripped.indexOf("{");
  return start === -1 ? null : stripped.slice(start);
}
