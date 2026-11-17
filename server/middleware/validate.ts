export type FieldRule =
  | { type: 'string'; required?: boolean; maxLength: number }
  | { type: 'array'; required?: boolean; maxItems: number; item: 'string' | 'message' };

/** Returns the first field name whose value violates its rule, or null if all pass. */
export function firstInvalidField(
  body: unknown,
  rules: Record<string, FieldRule>,
): string | null {
  const values = body !== null && typeof body === 'object'
    ? (body as Record<string, unknown>)
    : {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = values[field];
    if (value === undefined || value === null) {
      if (rule.required) return field;
      continue;
    }

    if (rule.type === 'string') {
      if (typeof value !== 'string' || value.length > rule.maxLength) return field;
      continue;
    }

    if (!Array.isArray(value) || value.length > rule.maxItems) return field;
    if (rule.item === 'string') {
      if (!value.every((entry) => typeof entry === 'string')) return field;
    } else {
      const valid = value.every((entry) => {
        if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return false;
        const message = entry as Record<string, unknown>;
        return typeof message.role === 'string' && typeof message.text === 'string';
      });
      if (!valid) return field;
    }
  }

  return null;
}
