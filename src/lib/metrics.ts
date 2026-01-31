import type { DailyEntry } from "@prisma/client";

export type Totals = {
  dials: number;
  prospects: number;
  setsNewBiz: number;
  setsExpansion: number;
  setsTotal: number;
  sqos: number;
};

export function sumTotals(entries: DailyEntry[]): Totals {
  return entries.reduce(
    (acc, entry) => {
      acc.dials += entry.actualDials ?? 0;
      acc.prospects += entry.actualNewProspects ?? 0;
      acc.setsNewBiz += entry.actualSetsNewBiz ?? 0;
      acc.setsExpansion += entry.actualSetsExpansion ?? 0;
      acc.sqos += entry.actualSQOs ?? 0;
      return acc;
    },
    { dials: 0, prospects: 0, setsNewBiz: 0, setsExpansion: 0, setsTotal: 0, sqos: 0 }
  );
}

export function withSetsTotal(totals: Totals): Totals {
  return {
    ...totals,
    setsTotal: totals.setsNewBiz + totals.setsExpansion,
  };
}
