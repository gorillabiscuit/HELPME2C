// Per ADR-0012 §5: EU users 16+, ROW 13+. Stricter than COPPA's 13 floor in EU
// because EU GDPR-K varies 13–16 by member state and 16 is the conservative pick.
const AGE_THRESHOLD_EU = 16;
const AGE_THRESHOLD_ROW = 13;

export function isOldEnough(birthDate: Date, isEU: boolean): boolean {
  if (Number.isNaN(birthDate.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= (isEU ? AGE_THRESHOLD_EU : AGE_THRESHOLD_ROW);
}

export function thresholdFor(isEU: boolean): number {
  return isEU ? AGE_THRESHOLD_EU : AGE_THRESHOLD_ROW;
}
