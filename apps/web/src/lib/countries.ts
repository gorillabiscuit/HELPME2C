// ISO 3166-1 alpha-2 country codes for the age-check picker.
//
// This is a curated subset, not the full ISO list. Covers all EU/EEA/UK/CH
// member states (load-bearing for the GDPR threshold gate), plus the top
// ~30 non-EU countries by internet-user population. Together: ~60 entries.
// Users in the long tail can type any valid ISO alpha-2 code via the
// "Other" fallback in the form — we accept anything matching /^[A-Z]{2}$/.
//
// Sources for the EU/EEA/UK/CH set:
// - EU member states: https://european-union.europa.eu/principles-countries-history/eu-countries_en
// - EEA additions: https://www.efta.int/eea
// - Switzerland: GDPR-aligned per Swiss FADP (ADR-0012 §1)
// - UK: post-Brexit but still under UK GDPR (ADR-0012 §1)

export interface CountryOption {
  readonly code: string; // ISO 3166-1 alpha-2 (uppercase)
  readonly name: string;
}

// EU 27 + EEA 3 (Iceland, Liechtenstein, Norway) + UK + Switzerland.
// Used by isEuCountry() to derive the 16+ GDPR threshold per ADR-0012 §5.
// Sorted alphabetically by code so additions are easy to spot in diff.
export const EU_COUNTRY_CODES: ReadonlySet<string> = new Set([
  'AT',
  'BE',
  'BG',
  'CH',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GB',
  'GR',
  'HR',
  'HU',
  'IE',
  'IS',
  'IT',
  'LI',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
]);

// Curated picker list. Order: alphabetical by display name.
// EU/EEA/UK/CH entries marked with a leading € would clutter the UI —
// the visual treatment is handled by isEuCountry() at render time.
export const COUNTRIES: ReadonlyArray<CountryOption> = [
  { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'CA', name: 'Canada' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EG', name: 'Egypt' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MT', name: 'Malta' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TR', name: 'Türkiye' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'VN', name: 'Vietnam' },
];

export function isEuCountry(code: string | null | undefined): boolean {
  if (!code) return false;
  return EU_COUNTRY_CODES.has(code.toUpperCase());
}

// Given a country code (from IP header, form input, etc.), return the
// derived legal-gate region. Defaults to 'row' for unknown / missing
// codes — safer to apply the looser 13+ threshold by default and let
// the user override via region radio than to wrongly trigger 16+ for
// non-EU users.
export function regionForCountry(code: string | null | undefined): 'eu' | 'row' {
  return isEuCountry(code) ? 'eu' : 'row';
}
