/**
 * Extracts an invite code from a scanned QR payload: a web invite URL
 * (…/groups?invite=CODE) or a raw code. Returns '' for junk.
 *
 * The backend alphabet is [A-Za-z0-9] (fixed length 6 today), so input is
 * uppercased for normalisation; the 4–10 character window is tolerance for
 * future length changes.
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
