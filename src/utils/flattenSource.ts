export function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = flattenObject(value as Record<string, unknown>, fullKey);
      Object.assign(result, nested);
    } else if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value);
    } else if (value === null || value === undefined) {
      result[fullKey] = '';
    } else {
      result[fullKey] = String(value);
    }
  }

  return result;
}

export function getAllFields(flattenedHits: Record<string, string>[]): string[] {
  const fieldSet = new Set<string>();
  for (const hit of flattenedHits) {
    for (const key of Object.keys(hit)) {
      fieldSet.add(key);
    }
  }

  const fields = Array.from(fieldSet);
  // Sort: priority fields first, then alphabetical
  const priority = ['@timestamp', 'log', 'stream', 'time', '_p'];
  return [
    ...priority.filter(f => fields.includes(f)),
    ...fields.filter(f => !priority.includes(f)).sort(),
  ];
}
