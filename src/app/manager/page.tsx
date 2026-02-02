import Link from "next/link";
import type { DailyEntry } from "@prisma/client";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMonthKeys, getMonthRange, todayISO, yesterdayISO } from "@/lib/date";
import { isManagerAuthed } from "@/lib/auth";
import { addRep, deleteRep, managerLogin, managerLogout } from "@/app/actions";

export const dynamic = "force-dynamic";

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

function formatNumber(value?: number | null) {
  return typeof value === "number" ? value : "-";
}

function formatText(value?: string | null) {
  if (!value) return "-";
  const trimmed = value.trim();
  return trimmed ? trimmed : "-";
}

function formatActualSets(entry?: DailyEntry | null) {
  if (!entry) return "-";
  const hasActualSets =
    entry.actualSetsNewBiz !== null || entry.actualSetsExpansion !== null;
  if (!hasActualSets) return "-";
  return (entry.actualSetsNewBiz ?? 0) + (entry.actualSetsExpansion ?? 0);
}

export default async function ManagerPage({
  searchParams,
}: {
  searchParams?: { error?: string; added?: string; deleted?: string };
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

  const today = todayISO();
  const yesterday = yesterdayISO();

  const repError =
    searchParams?.error === "duplicate"
      ? "That name already exists."
      : searchParams?.error === "missing"
        ? "Enter a name to add."
        : "";
  const repAdded = searchParams?.added === "1";
  const repDeleted = searchParams?.deleted === "1";

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
        <h2 className="text-lg font-semibold text-slate-900">Add SDR</h2>
        <p className="mt-1 text-sm text-slate-600">
          Add a rep name to the dropdown on the homepage.
        </p>
        <form action={addRep} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            name="name"
            placeholder="Rep name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Add SDR
          </button>
        </form>
        {repError && <p className="mt-2 text-sm text-rose-600">{repError}</p>}
        {repAdded && (
          <p className="mt-2 text-sm text-emerald-600">
            Rep added. Refresh the homepage dropdown.
          </p>
        )}
        {repDeleted && (
          <p className="mt-2 text-sm text-emerald-600">
            Rep deleted.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Manage SDRs</h2>
        <p className="mt-1 text-sm text-slate-600">
          Deleting a rep removes their entries.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((rep) => (
                <tr key={rep.id} className="border-t">
                  <td className="py-2 font-medium text-slate-700">
                    {rep.name}
                  </td>
                  <td className="py-2">
                    <form action={deleteRep}>
                      <input type="hidden" name="userId" value={rep.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {reps.length === 0 && (
                <tr>
                  <td className="py-2 text-slate-500" colSpan={2}>
                    No SDRs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Today’s Plan + Yesterday’s Attainment
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Today: {today} · Yesterday: {yesterday}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Rep</th>
                <th className="py-2">Today’s Plan</th>
                <th className="py-2">Yesterday’s Attainment</th>
              </tr>
            </thead>
            <tbody>
              {reps.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={3}>
                    No SDRs found.
                  </td>
                </tr>
              )}
              {reps.map((rep) => {
                const todayEntry = rep.entries.find((entry) => entry.date === today);
                const yesterdayEntry = rep.entries.find(
                  (entry) => entry.date === yesterday
                );
                return (
                  <tr key={rep.id} className="border-t align-top">
                    <td className="py-3 font-medium text-slate-700">{rep.name}</td>
                    <td className="py-3">
                      <div className="space-y-1 text-xs text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-700">
                            Goals:
                          </span>{" "}
                          Dials {formatNumber(todayEntry?.goalDials)} ·
                          Prospects {formatNumber(todayEntry?.goalNewProspects)} ·
                          Sets {formatNumber(todayEntry?.goalSetsTotal)} ·
                          SQOs {formatNumber(todayEntry?.goalSQOs)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">
                            Target Focus:
                          </span>{" "}
                          {formatText(todayEntry?.focusText)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="space-y-1 text-xs text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-700">
                            Actuals:
                          </span>{" "}
                          Dials {formatNumber(yesterdayEntry?.actualDials)} ·
                          Prospects{" "}
                          {formatNumber(yesterdayEntry?.actualNewProspects)} ·
                          Sets {formatActualSets(yesterdayEntry)} · SQOs{" "}
                          {formatNumber(yesterdayEntry?.actualSQOs)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">
                            Wins:
                          </span>{" "}
                          {formatText(yesterdayEntry?.wins)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">
                            Blockers:
                          </span>{" "}
                          {formatText(yesterdayEntry?.blockers)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">
                            Notes:
                          </span>{" "}
                          {formatText(yesterdayEntry?.notes)}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

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
