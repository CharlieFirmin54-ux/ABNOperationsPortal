export function isSameOrigin(request: Request): boolean {
  const expected = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) {
    return parseOrigin(origin) === expected;
  }
  const referer = request.headers.get("referer");
  if (referer) {
    return parseOrigin(referer) === expected;
  }
  return false;
}

function parseOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
