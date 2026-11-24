export const sourceTimes = Array.from({length:31}, (_, index) => index === 0 ? 0 : Math.round((index + 1) * 7) / 100);

export function sourceFrame(value, fallback = 17) {
  const number = Number(value);
  return value !== null && value !== "" && Number.isInteger(number) && number >= 1 && number <= 31 ? number : fallback;
}
