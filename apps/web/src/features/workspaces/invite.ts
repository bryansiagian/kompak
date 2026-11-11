export function buildInviteLink(origin: string, code: string): string {
  return `${origin}/join/${encodeURIComponent(code)}`;
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// Pengguna boleh menempel kode saja atau seluruh tautan undangan.
export function extractInviteCode(input: string): string {
  const withoutQuery = input.trim().split(/[?#]/)[0];
  const segments = withoutQuery
    .split('/')
    .filter((segment) => segment.length > 0);
  return (segments.at(-1) ?? '').toUpperCase();
}