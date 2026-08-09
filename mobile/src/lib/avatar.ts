/**
 * Normalises a group/user avatar string to a data-URI suitable for Image source.
 * Accepts either a bare base-64 payload or an already-prefixed data: URI.
 */
export function avatarSrc(avatar: string): string {
  return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
}

/**
 * Avatar fallback initials from a free-form name: first letter of up to two
 * whitespace-separated words, uppercased. Falls back to `fallback` when the
 * name yields nothing. Consolidates the per-screen copies that mirrored the
 * web `authorInitials`/`groupInitials`/`invitationFallback` helpers.
 */
export function initialsFromName(name: string, fallback = '?'): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || fallback
  );
}
