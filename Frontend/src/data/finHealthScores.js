// Shared financial-health scoring rules. Inputs are percentages, not fractions.
export const valid = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const round = n => Math.round(n * 100) / 100;
const clamp = n => Math.min(100, Math.max(0, n));
export const average = (a, b) => valid(a) && valid(b) ? round((Number(a) + Number(b)) / 2) : null;
export const eirScore = value => valid(value) ? round(clamp(100 - 1.25 * (Number(value) - 60))) : null;
export const srScore = value => valid(value) ? round(clamp(Number(value) * 5)) : null;
export const dsrScore = value => {
  if (!valid(value)) return null;
  const x = Number(value);
  const score = x <= 15 ? 100 : x <= 30 ? 100 - 2*(x-15)
    : x <= 35 ? 70 - 2*(x-30) : x <= 40 ? 60 - 4*(x-35)
    : x <= 45 ? 40 - 4*(x-40) : 0;
  return round(clamp(score));
};
export const odpScore = value => valid(value) ? round(clamp(Number(value))) : null;
export const trcScore = (recordedDays, recordedPeriods) =>
  valid(recordedDays) && valid(recordedPeriods)
    ? average(clamp(Number(recordedDays)/8*100), clamp(Number(recordedPeriods)/4*100)) : null;
export const scScore = (positiveSavingDays, positiveSavingPeriods) =>
  valid(positiveSavingDays) && valid(positiveSavingPeriods)
    ? average(clamp(Number(positiveSavingDays)/4*100), clamp(Number(positiveSavingPeriods)/4*100)) : null;
export const odpLevel = value => {
  if (!valid(value)) return null;
  const x=Number(value);
  return x >= 100 ? 'ดีเยี่ยม' : x >= 80 ? 'ดี' : x >= 50 ? 'ปานกลาง'
    : x > 0 ? 'ควรปรับปรุง' : 'ไม่ชำระตรงเวลา';
};
