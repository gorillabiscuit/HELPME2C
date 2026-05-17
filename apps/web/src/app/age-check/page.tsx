import { headers } from 'next/headers';
import { AgeCheckForm } from '@/components/age-check-form';

// /age-check is the post-signup gate. Reads Vercel's x-vercel-ip-country
// header to pre-select a sensible default country in the form. Header is
// only present on Vercel-served requests (Node runtime gets it via the
// standard `headers()` API; we don't need Edge runtime for this).
//
// In local dev or when the header is missing (corp proxies, scrapers),
// the form falls back to its own default. The user can always change
// the picked country.
export default async function AgeCheckPage() {
  const h = await headers();
  const ipCountry = h.get('x-vercel-ip-country');
  // Vercel returns uppercase ISO-3166-1 alpha-2 already, but normalise
  // defensively in case the header value comes from a different source.
  const initialCountry = ipCountry?.toUpperCase() ?? null;
  return <AgeCheckForm initialCountry={initialCountry} />;
}
