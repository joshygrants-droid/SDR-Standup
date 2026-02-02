import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPresetRange } from "@/lib/date";
import { sumTotals, withSetsTotal } from "@/lib/metrics";

export const dynamic = "force-dynamic";

type DashboardProps = {
  searchParams?: {
    range?: string;
    start?: string;
    end?: string;
    metric?: string;
    sort?: string;
    direction?: string;
  };
};

type LeaderboardRow = {
  id: string;
  name: string;
  dials: number;
  prospects: number;
  setsNewBiz: number;
  setsExpansion: number;
  setsTotal: number;
  sqos: number;
};

type MetricKey = Exclude<keyof LeaderboardRow, "id" | "name">;
type SortKey = "name" | "metric";
type SortDirection = "asc" | "desc";

const metricKeys: MetricKey[] = [
  "dials",
  "prospects",
  "setsNewBiz",
  "setsExpansion",
  "setsTotal",
  "sqos",
];

const isMetricKey = (value?: string): value is MetricKey =>
  !!value && metricKeys.includes(value as MetricKey);

const isSortKey = (value?: string): value is SortKey =>
  value === "name" || value === "metric";

const isDirection = (value?: string): value is SortDirection =>
  value === "asc" || value === "desc";

function resolveRange(searchParams?: DashboardProps["searchParams"]) {
  const range = searchParams?.range ?? "yesterday";
  if (range === "custom" && searchParams?.start && searchParams?.end) {
    const start = searchParams.start;
    const end = searchParams.end;
    return { range, start, end };
  }
  const preset = getPresetRange(range);
  return { range, start: preset.start, end: preset.end };
}

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const { range, start, end } = resolveRange(searchParams);
  const metric: MetricKey = isMetricKey(searchParams?.metric)
    ? searchParams?.metric
    : "dials";
  const sort: SortKey = isSortKey(searchParams?.sort)
    ? searchParams?.sort
    : "metric";
  const direction: SortDirection = isDirection(searchParams?.direction)
    ? searchParams?.direction
    : "desc";
  const baseQuery = { range, start, end, metric };

  const entries = await prisma.dailyEntry.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    orderBy: { date: "asc" },
  });

  const totals = withSetsTotal(sumTotals(entries));
  const dailyMap = new Map<string, ReturnType<typeof sumTotals>>();

  for (const entry of entries) {
    const existing = dailyMap.get(entry.date) ?? {
      dials: 0,
      prospects: 0,
      setsNewBiz: 0,
      setsExpansion: 0,
      setsTotal: 0,
      sqos: 0,
    };

    existing.dials += entry.actualDials ?? 0;
    existing.prospects += entry.actualNewProspects ?? 0;
    existing.setsNewBiz += entry.actualSetsNewBiz ?? 0;
    existing.setsExpansion += entry.actualSetsExpansion ?? 0;
    existing.sqos += entry.actualSQOs ?? 0;
    existing.setsTotal = existing.setsNewBiz + existing.setsExpansion;

    dailyMap.set(entry.date, existing);
  }

  const dailyTotals = Array.from(dailyMap.entries());

  const reps = await prisma.user.findMany({
    where: { role: Role.SDR },
    orderBy: { name: "asc" },
    include: {
      entries: {
        where: { date: { gte: start, lte: end } },
      },
    },
  });

  const rows: LeaderboardRow[] = reps.map((rep) => {
    const base = {
      dials: 0,
      prospects: 0,
      setsNewBiz: 0,
      setsExpansion: 0,
      setsTotal: 0,
      sqos: 0,
    };

    for (const entry of rep.entries) {
      base.dials += entry.actualDials ?? 0;
      base.prospects += entry.actualNewProspects ?? 0;
      base.setsNewBiz += entry.actualSetsNewBiz ?? 0;
      base.setsExpansion += entry.actualSetsExpansion ?? 0;
      base.sqos += entry.actualSQOs ?? 0;
    }

    base.setsTotal = base.setsNewBiz + base.setsExpansion;
    return { id: rep.id, name: rep.name, ...base };
  });

  const sorted = [...rows].sort((a, b) => {
    if (sort === "name") {
      return direction === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    const diff = b[metric] - a[metric];
    return direction === "asc" ? -diff : diff;
  });

  const toggleDirection = (value: string) =>
    sort === value && direction === "desc" ? "asc" : "desc";
  const showDialsColumn = metric !== "dials";

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Team Dashboard + Leaderboard
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Team Performance
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {start} through {end}
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Range
            <select
              name="range"
              defaultValue={range}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="yesterday">Yesterday</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Start
            <input
              type="date"
              name="start"
              defaultValue={start}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            End
            <input
              type="date"
              name="end"
              defaultValue={end}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Leaderboard Metric
            <select
              name="metric"
              defaultValue={metric}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="dials">Dials</option>
              <option value="setsTotal">Total Sets</option>
              <option value="setsNewBiz">New Biz Sets</option>
              <option value="setsExpansion">Expansion Sets</option>
              <option value="sqos">SQOs</option>
              <option value="prospects">New Prospects Added</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Apply
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Dials", value: totals.dials },
          { label: "New Prospects", value: totals.prospects },
          { label: "Total Sets", value: totals.setsTotal },
          { label: "New Biz Sets", value: totals.setsNewBiz },
          { label: "Expansion Sets", value: totals.setsExpansion },
          { label: "SQOs", value: totals.sqos },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Leaderboard
          </h2>
          <p className="text-sm text-slate-500">
            Ranked by {metric === "prospects"
              ? "New Prospects"
              : metric === "setsTotal"
              ? "Total Sets"
              : metric === "setsNewBiz"
              ? "New Biz Sets"
              : metric === "setsExpansion"
              ? "Expansion Sets"
              : metric === "sqos"
              ? "SQOs"
              : "Dials"}
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Rank</th>
                <th className="py-2">
                  <Link
                    href={{
                      pathname: "/dashboard",
                      query: {
                        ...baseQuery,
                        sort: "name",
                        direction: toggleDirection("name"),
                      },
                    }}
                    className="hover:text-slate-700"
                  >
                    Rep
                  </Link>
                </th>
                <th className="py-2">
                  <Link
                    href={{
                      pathname: "/dashboard",
                      query: {
                        ...baseQuery,
                        sort: "metric",
                        direction: toggleDirection("metric"),
                      },
                    }}
                    className="hover:text-slate-700"
                  >
                    Selected Metric
                  </Link>
                </th>
                {showDialsColumn && <th className="py-2">Dials</th>}
                <th className="py-2">Prospects</th>
                <th className="py-2">New Biz Sets</th>
                <th className="py-2">Expansion Sets</th>
                <th className="py-2">Total Sets</th>
                <th className="py-2">SQOs</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={9}>
                    No entries yet.
                  </td>
                </tr>
              )}
              {sorted.map((row, index) => (
                <tr key={row.id} className="border-t">
                  <td className="py-2">{index + 1}</td>
                  <td className="py-2 font-medium text-slate-800">{row.name}</td>
                  <td className="py-2 font-semibold text-slate-900">
                    {row[metric as keyof typeof row]}
                  </td>
                  {showDialsColumn && <td className="py-2">{row.dials}</td>}
                  <td className="py-2">{row.prospects}</td>
                  <td className="py-2">{row.setsNewBiz}</td>
                  <td className="py-2">{row.setsExpansion}</td>
                  <td className="py-2">{row.setsTotal}</td>
                  <td className="py-2">{row.sqos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Daily Totals</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">Dials</th>
                <th className="py-2">Prospects</th>
                <th className="py-2">New Biz Sets</th>
                <th className="py-2">Expansion Sets</th>
                <th className="py-2">SQOs</th>
              </tr>
            </thead>
            <tbody>
              {dailyTotals.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={6}>
                    No entries in this range yet.
                  </td>
                </tr>
              )}
              {dailyTotals.map(([date, totalsForDate]) => (
                <tr key={date} className="border-t">
                  <td className="py-2 font-medium text-slate-700">{date}</td>
                  <td className="py-2">{totalsForDate.dials}</td>
                  <td className="py-2">{totalsForDate.prospects}</td>
                  <td className="py-2">{totalsForDate.setsNewBiz}</td>
                  <td className="py-2">{totalsForDate.setsExpansion}</td>
                  <td className="py-2">{totalsForDate.sqos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
