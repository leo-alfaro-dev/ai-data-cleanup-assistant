const UNKNOWN_ADDRESS = 'unknown';

// Vercel sets x-forwarded-for to the visitor's address, replacing anything the client sent.
export function readVisitorAddress(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;

  return headers.get('x-real-ip')?.trim() || UNKNOWN_ADDRESS;
}
