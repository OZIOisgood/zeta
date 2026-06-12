/**
 * Normalises a group/user avatar string to a data-URI suitable for Image source.
 * Accepts either a bare base-64 payload or an already-prefixed data: URI.
 */
export function avatarSrc(avatar: string): string {
  return avatar.startsWith('data:') ? avatar : `data:image/jpeg;base64,${avatar}`;
}
