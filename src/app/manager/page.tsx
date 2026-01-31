import Link from "next/link";
import type { DailyEntry } from "@prisma/client";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMonthKeys, getMonthRange } from "@/lib/date";
import { isManagerAuthed } from "@/lib/auth";
import { managerLogin, managerLogout } from "@/app/actions";

type MetricTotals = {
  dials: number;
  prospects: number;
  setsNewBiz: number;
  setsExpansion: number;
  setsTotal: number;
  sqos: number;
  entries: number;
};

function emptyTotals(): MetricTotals {
  return {
    dials: 0,
    prospects: 0,
    setsNewBiz: 0,
    setsExpansion: 0,
    setsTotal: 0,
    sqos: 0,
    entries: 0,
  };
}

function summarize(entries: DailyEntry[]) {
  const totals = emptyTotals();
  for (const entry of entries) {
    totals.dials += entry.actualDials ?? 0;
    totals.prospects += entry.actualNewProspects ?? 0;
    totals.setsNewBiz += entry.actualSetsNewBiz ?? 0;
    totals.setsExpansion += entry.actualSetsExpansion ?? 0;
    totals.sqos += entry.actualSQOs ?? 0;
    totals.entries += 1;
  }
  totals.setsTotal = totals.setsNewBiz + totals.setsExpansion;
  return totals;
}

export default async function ManagerPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const authed = await isManagerAuthed();

  if (!authed) {
    return (
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Manager Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter the manager PIN to view dashboards.
        </p>
        <form action={managerLogin} className="mt-4 space-y-3">
          <input
            type="password"
            name="pin"
            placeholder="Manager PIN"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          {searchParams?.error === "invalid" && (
            <p className="text-sm text-rose-600">Invalid PIN. Try again.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Enter Manager Hub
          </button>
        </form>
      </div>
    );
  }

  const monthKeys = getMonthKeys(6);
  const newestRange = getMonthRange(monthKeys[0]);
  const oldestRange = getMonthRange(monthKeys[monthKeys.length - 1]);

  const reps = await prisma.user.findMany({
    where: { role: Role.SDR },
    orderBy: { name: "asc" },
    include: {
      entries: {
        where: { date: { gte: oldestRange.start, lte: newestRange.end } },
      },
    },
  });

  const teamEntries = reps.flatMap((rep) => rep.entries);

  const monthLabels = monthKeys.map((key) => {
    const [year, month] = key.split("-");
    return `${year}-${month}`;
  });

  const teamByMonth = monthKeys.map((key) => {
    const entries = teamEntries.filter((entry) => entry.date.startsWith(key));
    return summarize(entries);
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Manager Hub
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Month-over-Month Summary
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Last 6 months · totals and averages per entry day.
          </p>
        </div>
        <form action={managerLogout}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Log out
          </button>
        </form>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Team Summary</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Month</th>
                <th className="py-2">Dials (avg)</th>
                <th className="py-2">Prospects (avg)</th>
                <th className="py-2">Total Sets (avg)</th>
                <th className="py-2">SQOs (avg)</th>
                <th className="py-2">Entry Days</th>
              </tr>
            </thead>
            <tbody>
              {teamByMonth.map((totals, index) => {
                const days = totals.entries || 1;
                return (
                  <tr key={monthKeys[index]} className="border-t">
                    <td className="py-2 font-medium text-slate-700">
                      {monthLabels[index]}
                    </td>
                    <td className="py-2">
                      {totals.dials} ({Math.round(totals.dials / days)})
                    </td>
                    <td className="py-2">
                      {totals.prospects} ({Math.round(totals.prospects / days)})
                    </td>
                    <td className="py-2">
                      {totals.setsTotal} ({Math.round(totals.setsTotal / days)})
                    </td>
                    <td className="py-2">
                      {totals.sqos} ({Math.round(totals.sqos / days)})
                    </td>
                    <td className="py-2">{totals.entries}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {reps.map((rep) => (
          <div
            key={rep.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {rep.name}
                </h3>
                <p className="text-sm text-slate-500">
                  Month-over-month performance
                </p>
              </div>
              <Link
                href={`/manager/rep/${rep.id}`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                View Rep Detail
              </Link>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="uppercase text-slate-400">
                  <tr>
                    <th className="py-2">Month</th>
                    <th className="py-2">Dials (avg)</th>
                    <th className="py-2">Prospects (avg)</th>
                    <th className="py-2">Total Sets (avg)</th>
                    <th className="py-2">SQOs (avg)</th>
                    <th className="py-2">Entry Days</th>
                  </tr>
                </thead>
                <tbody>
                  {monthKeys.map((key, index) => {
                    const entries = rep.entries.filter((entry) =>
                      entry.date.startsWith(key)
                    );
                    const totals = summarize(entries);
                    const days = totals.entries || 1;
                    return (
                      <tr key={key} className="border-t">
                        <td className="py-2 font-medium text-slate-700">
                          {monthLabels[index]}
                        </td>
                        <td className="py-2">
                          {totals.dials} ({Math.round(totals.dials / days)})
                        </td>
                        <td className="py-2">
                          {totals.prospects} ({Math.round(totals.prospects / days)})
                        </td>
                        <td className="py-2">
                          {totals.setsTotal} ({Math.round(totals.setsTotal / days)})
                        </td>
                        <td className="py-2">
                          {totals.sqos} ({Math.round(totals.sqos / days)})
                        </td>
                        <td className="py-2">{totals.entries}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
