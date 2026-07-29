function padded(value: number): string {
  return String(value).padStart(2, '0');
}

export function localDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return [
    String(date.getFullYear()).padStart(4, '0'),
    padded(date.getMonth() + 1),
    padded(date.getDate()),
  ].join('-');
}

export function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function nextLocalMidnight(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return date.getTime();
}

export function splitAtLocalMidnights(
  start: number,
  end: number,
): readonly { readonly dayKey: string; readonly start: number; readonly end: number }[] {
  if (
    !Number.isFinite(start)
    || !Number.isFinite(end)
    || end <= start
    || Number.isNaN(new Date(start).getTime())
    || Number.isNaN(new Date(end).getTime())
  ) {
    return [];
  }

  const pieces: { dayKey: string; start: number; end: number }[] = [];
  let pieceStart = start;

  while (pieceStart < end) {
    const midnight = nextLocalMidnight(pieceStart);
    const pieceEnd = Number.isFinite(midnight) ? Math.min(midnight, end) : end;
    if (!Number.isFinite(pieceEnd) || pieceEnd <= pieceStart) {
      return [];
    }

    pieces.push({
      dayKey: localDayKey(pieceStart),
      start: pieceStart,
      end: pieceEnd,
    });
    pieceStart = pieceEnd;
  }

  return pieces;
}
