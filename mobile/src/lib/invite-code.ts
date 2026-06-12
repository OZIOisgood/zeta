/**
 * Extracts an invite code from a scanned QR payload: a web invite URL
 * (…/groups?invite=CODE) or a raw code. Returns '' for junk.
 */
export function parseInviteCode(data: string): string {
  if (!data) return '';

  // Try to parse as a URL and extract the invite query param
  try {
    const url = new URL(data);
    const code = url.searchParams.get('invite');
    if (code) {
      const trimmed = code.trim().toUpperCase();
      return /^[A-Z0-9]{4,10}$/.test(trimmed) ? trimmed : '';
    }
    // URL without invite param
    return '';
  } catch {
    // Not a URL — treat as raw code: 4–10 alphanumerics
    const trimmed = data.trim().toUpperCase();
    return /^[A-Z0-9]{4,10}$/.test(trimmed) ? trimmed : '';
  }
}
