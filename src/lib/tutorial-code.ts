export function formatTutorialCode(code: string) {
  if (/^\d+$/.test(code)) {
    return String(Number(code));
  }

  return code;
}
