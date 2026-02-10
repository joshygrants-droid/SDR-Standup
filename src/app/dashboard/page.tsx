import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPresetRange, todayISO } from "@/lib/date";
import { sumTotals, withSetsTotal } from "@/lib/metrics";
import RangeForm from "@/app/dashboard/RangeForm";

export const dynamic = "force-dynamic";

type SearchParams = {
  range?: string;
  start?: string;
  end?: string;
  metric?: string;
  sort?: string;
  direction?: string;
};

type DashboardProps = {
  searchParams?: Promise<SearchParams>;
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

type GoalRow = {
  id: string;
  name: string;
  goalDials: number;
  goalProspects: number;
  goalSetsNewBiz: number;
  goalSetsExpansion: number;
  goalSetsTotal: number;
  goalSQOs: number;
  focusText: string;
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

function sumGoalTotals(
  entries: Array<{
  goalDials: number | null;
  goalNewProspects: number | null;
  goalSetsNewBiz: number | null;
  goalSetsExpansion: number | null;
  goalSQOs: number | null;
  }>,
): ReturnType<typeof sumTotals> {
  return entries.reduce(
    (acc, entry) => {
      acc.dials += entry.goalDials ?? 0;
      acc.prospects += entry.goalNewProspects ?? 0;
      acc.setsNewBiz += entry.goalSetsNewBiz ?? 0;
      acc.setsExpansion += entry.goalSetsExpansion ?? 0;
      acc.sqos += entry.goalSQOs ?? 0;
      return acc;
    },
    { dials: 0, prospects: 0, setsNewBiz: 0, setsExpansion: 0, setsTotal: 0, sqos: 0 }
  );
}

function resolveRange(searchParams?: SearchParams) {
  const range = searchParams?.range ?? "week";
  const hasCustomDates = !!(searchParams?.start && searchParams?.end);

  if (range === "custom" && hasCustomDates) {
    return { range, start: searchParams!.start!, end: searchParams!.end! };
  }

  const preset = getPresetRange(range);

  if (
    hasCustomDates &&
    (searchParams!.start !== preset.start || searchParams!.end !== preset.end)
  ) {
    return { range: "custom", start: searchParams!.start!, end: searchParams!.end! };
  }

  return { range, start: preset.start, end: preset.end };
}

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const params = searchParams ? await searchParams : {};
  const { range, start, end } = resolveRange(params);
  const metric: MetricKey = isMetricKey(params?.metric)
    ? params?.metric
    : "dials";
  const sort: SortKey = isSortKey(params?.sort)
    ? params?.sort
    : "metric";
  const direction: SortDirection = isDirection(params?.direction)
    ? params?.direction
    : "desc";
  const baseQuery = { range, start, end, metric };
  const today = todayISO();

  const entries = await prisma.dailyEntry.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    orderBy: { date: "asc" },
  });

  const totals = withSetsTotal(sumTotals(entries));
  const todayEntries = await prisma.dailyEntry.findMany({
    where: { date: today },
  });
  const goalTotals = withSetsTotal(sumGoalTotals(todayEntries));
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

  const todayEntryByUserId = new Map(
    todayEntries.map((entry) => [entry.userId, entry]),
  );

  const goalRows: GoalRow[] = reps.map((rep) => {
    const todayEntry = todayEntryByUserId.get(rep.id);
    const goals = {
      goalDials: todayEntry?.goalDials ?? 0,
      goalProspects: todayEntry?.goalNewProspects ?? 0,
      goalSetsNewBiz: todayEntry?.goalSetsNewBiz ?? 0,
      goalSetsExpansion: todayEntry?.goalSetsExpansion ?? 0,
      goalSetsTotal:
        (todayEntry?.goalSetsNewBiz ?? 0) +
        (todayEntry?.goalSetsExpansion ?? 0),
      goalSQOs: todayEntry?.goalSQOs ?? 0,
    };

    return {
      id: rep.id,
      name: rep.name,
      ...goals,
      focusText: todayEntry?.focusText || "—",
    };
  });

  const goalsVsActualsRows = reps.map((rep) => {
    let goalDials = 0;
    let goalProspects = 0;
    let goalSetsNewBiz = 0;
    let goalSetsExpansion = 0;
    let goalSQOs = 0;

    let actualDials = 0;
    let actualProspects = 0;
    let actualSetsNewBiz = 0;
    let actualSetsExpansion = 0;
    let actualSQOs = 0;

    for (const entry of rep.entries) {
      goalDials += entry.goalDials ?? 0;
      goalProspects += entry.goalNewProspects ?? 0;
      goalSetsNewBiz += entry.goalSetsNewBiz ?? 0;
      goalSetsExpansion += entry.goalSetsExpansion ?? 0;
      goalSQOs += entry.goalSQOs ?? 0;

      actualDials += entry.actualDials ?? 0;
      actualProspects += entry.actualNewProspects ?? 0;
      actualSetsNewBiz += entry.actualSetsNewBiz ?? 0;
      actualSetsExpansion += entry.actualSetsExpansion ?? 0;
      actualSQOs += entry.actualSQOs ?? 0;
    }

    const goalSetsTotal = goalSetsNewBiz + goalSetsExpansion;
    const actualSetsTotal = actualSetsNewBiz + actualSetsExpansion;

    return {
      id: rep.id,
      name: rep.name,
      goalDials,
      goalProspects,
      goalSetsTotal,
      goalSQOs,
      actualDials,
      actualProspects,
      actualSetsTotal,
      actualSQOs,
    };
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
        <RangeForm
          key={`${range}-${start}-${end}-${metric}`}
          range={range}
          start={start}
          end={end}
          metric={metric}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Dials", value: totals.dials },
          { label: "New Prospects", value: totals.prospects },
          { label: "Total Sets", value: totals.setsTotal },
          { label: "New Biz Sets", value: totals.setsNewBiz },
          { label: "Upsell Sets", value: totals.setsExpansion },
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
              ? "Upsell Sets"
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
                <th className="py-2">Dials</th>
                <th className="py-2">Prospects</th>
                <th className="py-2">New Biz Sets</th>
                <th className="py-2">Upsell Sets</th>
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
                  <td className="py-2">{row.dials}</td>
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Goals by Rep
          </h2>
          <p className="text-sm text-slate-500">
            Today’s goals and target focus ({today})
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Rep</th>
                <th className="py-2">Goal Dials</th>
                <th className="py-2">Goal Prospects</th>
                <th className="py-2">Goal New Biz Sets</th>
                <th className="py-2">Goal Upsell Sets</th>
                <th className="py-2">Goal Sets</th>
                <th className="py-2">Goal SQOs</th>
                <th className="py-2">Target Focus</th>
              </tr>
            </thead>
            <tbody>
              {goalRows.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={8}>
                    No goals in this range yet.
                  </td>
                </tr>
              )}
              {goalRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="py-2 font-medium text-slate-800">
                    {row.name}
                  </td>
                  <td className="py-2">{row.goalDials}</td>
                  <td className="py-2">{row.goalProspects}</td>
                  <td className="py-2">{row.goalSetsNewBiz}</td>
                  <td className="py-2">{row.goalSetsExpansion}</td>
                  <td className="py-2 font-semibold text-slate-900">
                    {row.goalSetsTotal}
                  </td>
                  <td className="py-2">{row.goalSQOs}</td>
                  <td className="py-2 text-slate-700">{row.focusText}</td>
                </tr>
              ))}
              {goalRows.length > 0 && (
                <tr className="border-t bg-slate-50">
                  <td className="py-2 font-semibold text-slate-900">Team Total</td>
                  <td className="py-2 font-semibold text-slate-900">
                    {goalTotals.dials}
                  </td>
                  <td className="py-2 font-semibold text-slate-900">
                    {goalTotals.prospects}
                  </td>
                  <td className="py-2 font-semibold text-slate-900">
                    {goalTotals.setsNewBiz}
                  </td>
                  <td className="py-2 font-semibold text-slate-900">
                    {goalTotals.setsExpansion}
                  </td>
                  <td className="py-2 font-semibold text-slate-900">
                    {goalTotals.setsTotal}
                  </td>
                  <td className="py-2 font-semibold text-slate-900">
                    {goalTotals.sqos}
                  </td>
                  <td className="py-2 text-slate-500">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Goals vs Actuals
          </h2>
          <p className="text-sm text-slate-500">
            Totals for {start} through {end}
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Rep</th>
                <th className="py-2">Dials Goal</th>
                <th className="py-2">Dials Actual</th>
                <th className="py-2">Prospects Goal</th>
                <th className="py-2">Prospects Actual</th>
                <th className="py-2">Sets Goal</th>
                <th className="py-2">Sets Actual</th>
                <th className="py-2">SQOs Goal</th>
                <th className="py-2">SQOs Actual</th>
              </tr>
            </thead>
            <tbody>
              {goalsVsActualsRows.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={9}>
                    No entries in this range yet.
                  </td>
                </tr>
              )}
              {goalsVsActualsRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="py-2 font-medium text-slate-800">
                    {row.name}
                  </td>
                  <td className="py-2">{row.goalDials}</td>
                  <td className="py-2">{row.actualDials}</td>
                  <td className="py-2">{row.goalProspects}</td>
                  <td className="py-2">{row.actualProspects}</td>
                  <td className="py-2">{row.goalSetsTotal}</td>
                  <td className="py-2">{row.actualSetsTotal}</td>
                  <td className="py-2">{row.goalSQOs}</td>
                  <td className="py-2">{row.actualSQOs}</td>
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
                <th className="py-2">Upsell Sets</th>
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
