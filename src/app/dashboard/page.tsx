import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPresetRange, yesterdayISO } from "@/lib/date";
import { sumTotals, withSetsTotal } from "@/lib/metrics";
import { CHECKLIST_ITEMS } from "@/lib/constants";
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
  date: string | null;
  goalDials: number;
  goalProspects: number;
  goalSetsNewBiz: number;
  goalSetsExpansion: number;
  goalSetsTotal: number;
  goalSQOs: number;
  actualDials: number;
  actualProspects: number;
  actualSetsNewBiz: number;
  actualSetsExpansion: number;
  actualSetsTotal: number;
  actualSQOs: number;
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

// Renders a "goal → actual" cell with a hit/miss indicator. Green ✓ when the
// actual met or exceeded the goal, red ✗ when it fell short. When no goal was
// set for the metric, we can't judge hit/miss, so just show the actual.
function GoalActualCell({ goal, actual }: { goal: number; actual: number }) {
  const hasGoal = goal > 0;
  const met = actual >= goal;

  if (!hasGoal) {
    return (
      <td className="py-3 pr-6 text-right tabular-nums whitespace-nowrap text-slate-300">
        {actual}
      </td>
    );
  }

  return (
    <td className="py-3 pr-6 text-right tabular-nums whitespace-nowrap">
      <span className="inline-flex items-baseline justify-end gap-1.5">
        <span className="text-xs text-slate-400">{goal}</span>
        <span className="text-xs text-slate-300">→</span>
        <span
          className={`text-sm font-semibold ${
            met ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {actual}
        </span>
        {met ? (
          <span
            className="text-emerald-600"
            aria-label="hit or exceeded goal"
          >
            ✓
          </span>
        ) : (
          <span className="text-rose-500" aria-label="missed goal">
            ✗
          </span>
        )}
      </span>
    </td>
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

  const entries = await prisma.dailyEntry.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    orderBy: { date: "asc" },
  });

  const totals = withSetsTotal(sumTotals(entries));

  // Each rep's most recent day that has actuals logged. Goals for a day are
  // entered that morning; actuals are entered the next morning, so the latest
  // day with actuals is where a real goal-vs-actual comparison exists.
  const entriesWithActuals = await prisma.dailyEntry.findMany({
    where: {
      OR: [
        { actualDials: { not: null } },
        { actualNewProspects: { not: null } },
        { actualSetsNewBiz: { not: null } },
        { actualSetsExpansion: { not: null } },
        { actualSQOs: { not: null } },
      ],
    },
    orderBy: { date: "desc" },
  });
  const latestActualByUserId = new Map<
    string,
    (typeof entriesWithActuals)[number]
  >();
  for (const entry of entriesWithActuals) {
    if (!latestActualByUserId.has(entry.userId)) {
      latestActualByUserId.set(entry.userId, entry);
    }
  }

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

  const goalRows: GoalRow[] = reps.map((rep) => {
    const entry = latestActualByUserId.get(rep.id);
    const goalSetsNewBiz = entry?.goalSetsNewBiz ?? 0;
    const goalSetsExpansion = entry?.goalSetsExpansion ?? 0;
    const actualSetsNewBiz = entry?.actualSetsNewBiz ?? 0;
    const actualSetsExpansion = entry?.actualSetsExpansion ?? 0;

    return {
      id: rep.id,
      name: rep.name,
      date: entry?.date ?? null,
      goalDials: entry?.goalDials ?? 0,
      goalProspects: entry?.goalNewProspects ?? 0,
      goalSetsNewBiz,
      goalSetsExpansion,
      goalSetsTotal: goalSetsNewBiz + goalSetsExpansion,
      goalSQOs: entry?.goalSQOs ?? 0,
      actualDials: entry?.actualDials ?? 0,
      actualProspects: entry?.actualNewProspects ?? 0,
      actualSetsNewBiz,
      actualSetsExpansion,
      actualSetsTotal: actualSetsNewBiz + actualSetsExpansion,
      actualSQOs: entry?.actualSQOs ?? 0,
      focusText: entry?.focusText || "—",
    };
  });

  // Team totals across each rep's latest completed day (rows that have one).
  const goalRowsWithEntry = goalRows.filter((row) => row.date !== null);
  const goalRowTotals = goalRowsWithEntry.reduce(
    (acc, row) => {
      acc.goalDials += row.goalDials;
      acc.actualDials += row.actualDials;
      acc.goalProspects += row.goalProspects;
      acc.actualProspects += row.actualProspects;
      acc.goalSetsNewBiz += row.goalSetsNewBiz;
      acc.actualSetsNewBiz += row.actualSetsNewBiz;
      acc.goalSetsExpansion += row.goalSetsExpansion;
      acc.actualSetsExpansion += row.actualSetsExpansion;
      acc.goalSetsTotal += row.goalSetsTotal;
      acc.actualSetsTotal += row.actualSetsTotal;
      acc.goalSQOs += row.goalSQOs;
      acc.actualSQOs += row.actualSQOs;
      return acc;
    },
    {
      goalDials: 0,
      actualDials: 0,
      goalProspects: 0,
      actualProspects: 0,
      goalSetsNewBiz: 0,
      actualSetsNewBiz: 0,
      goalSetsExpansion: 0,
      actualSetsExpansion: 0,
      goalSetsTotal: 0,
      actualSetsTotal: 0,
      goalSQOs: 0,
      actualSQOs: 0,
    },
  );

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
  const yesterday = yesterdayISO();
  const yesterdayEntries = await prisma.dailyEntry.findMany({
    where: { date: yesterday },
  });
  const yesterdayByUserId = new Map(
    yesterdayEntries.map((entry) => [entry.userId, entry]),
  );

  // Yesterday's per-rep completion of each checklist item.
  const checklistYesterdayRows = reps.map((rep) => {
    const entry = yesterdayByUserId.get(rep.id);
    const items = CHECKLIST_ITEMS.map((item) => ({
      key: item.key,
      done: Boolean(entry?.[item.key as keyof typeof entry]),
    }));
    return {
      id: rep.id,
      name: rep.name,
      logged: Boolean(entry),
      items,
      completed: items.filter((i) => i.done).length,
      total: CHECKLIST_ITEMS.length,
    };
  });

  // Completion rate across the selected range (days completed / days logged).
  const checklistRangeRows = reps.map((rep) => {
    const daysLogged = rep.entries.length;
    const perItem = CHECKLIST_ITEMS.map((item) => ({
      key: item.key,
      count: rep.entries.filter((e) => Boolean(e[item.key as keyof typeof e]))
        .length,
    }));
    const totalChecks = perItem.reduce((acc, i) => acc + i.count, 0);
    const rate =
      daysLogged > 0
        ? Math.round((totalChecks / (daysLogged * CHECKLIST_ITEMS.length)) * 100)
        : 0;
    return { id: rep.id, name: rep.name, daysLogged, perItem, rate };
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
            Daily Activity Checklist
          </h2>
          <p className="text-sm text-slate-500">
            Completed yesterday ({yesterday})
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Rep</th>
                {CHECKLIST_ITEMS.map((item) => (
                  <th key={item.key} className="py-2 text-center">
                    {item.short}
                  </th>
                ))}
                <th className="py-2 text-center">Done</th>
              </tr>
            </thead>
            <tbody>
              {checklistYesterdayRows.length === 0 && (
                <tr>
                  <td
                    className="py-3 text-slate-500"
                    colSpan={CHECKLIST_ITEMS.length + 2}
                  >
                    No reps yet.
                  </td>
                </tr>
              )}
              {checklistYesterdayRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="py-2 font-medium text-slate-800">
                    {row.name}
                    {!row.logged && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        (no entry)
                      </span>
                    )}
                  </td>
                  {row.items.map((item) => (
                    <td key={item.key} className="py-2 text-center">
                      {item.done ? (
                        <span className="text-emerald-600" aria-label="done">
                          ✓
                        </span>
                      ) : (
                        <span className="text-rose-500" aria-label="not done">
                          ✗
                        </span>
                      )}
                    </td>
                  ))}
                  <td
                    className={`py-2 text-center font-semibold ${
                      row.completed === row.total
                        ? "text-emerald-600"
                        : "text-slate-700"
                    }`}
                  >
                    {row.completed}/{row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {CHECKLIST_ITEMS.map((item) => `${item.short}: ${item.label}`).join(
            " · ",
          )}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Checklist Completion Rate
          </h2>
          <p className="text-sm text-slate-500">
            Days completed / days logged ({start} through {end})
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Rep</th>
                <th className="py-2 text-center">Days Logged</th>
                {CHECKLIST_ITEMS.map((item) => (
                  <th key={item.key} className="py-2 text-center">
                    {item.short}
                  </th>
                ))}
                <th className="py-2 text-center">Overall</th>
              </tr>
            </thead>
            <tbody>
              {checklistRangeRows.length === 0 && (
                <tr>
                  <td
                    className="py-3 text-slate-500"
                    colSpan={CHECKLIST_ITEMS.length + 3}
                  >
                    No entries in this range yet.
                  </td>
                </tr>
              )}
              {checklistRangeRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="py-2 font-medium text-slate-800">
                    {row.name}
                  </td>
                  <td className="py-2 text-center text-slate-600">
                    {row.daysLogged}
                  </td>
                  {row.perItem.map((item) => (
                    <td key={item.key} className="py-2 text-center">
                      {item.count}/{row.daysLogged}
                    </td>
                  ))}
                  <td
                    className={`py-2 text-center font-semibold ${
                      row.rate >= 100
                        ? "text-emerald-600"
                        : row.rate >= 75
                          ? "text-slate-700"
                          : "text-amber-600"
                    }`}
                  >
                    {row.rate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            Each rep’s most recent logged day — goal → actual
          </p>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          <span className="text-emerald-600">✓</span> hit or exceeded goal{" "}
          <span className="px-1">·</span>
          <span className="text-rose-500">✗</span> missed goal
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-6 font-medium">Rep</th>
                <th className="py-2 pr-6 font-medium">Day</th>
                <th className="py-2 pr-6 text-right font-medium">Dials</th>
                <th className="py-2 pr-6 text-right font-medium">Prospects</th>
                <th className="py-2 pr-6 text-right font-medium">New Biz Sets</th>
                <th className="py-2 pr-6 text-right font-medium">Upsell Sets</th>
                <th className="py-2 pr-6 text-right font-medium">Total Sets</th>
                <th className="py-2 pr-6 text-right font-medium">SQOs</th>
                <th className="border-l border-slate-100 py-2 pl-6 font-medium">
                  Target Focus
                </th>
              </tr>
            </thead>
            <tbody>
              {goalRows.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={9}>
                    No reps yet.
                  </td>
                </tr>
              )}
              {goalRows.map((row) =>
                row.date === null ? (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 even:bg-slate-50/60"
                  >
                    <td className="py-3 pr-6 font-medium text-slate-800 whitespace-nowrap">
                      {row.name}
                    </td>
                    <td className="py-3 text-slate-400" colSpan={8}>
                      No logged day yet
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 even:bg-slate-50/60"
                  >
                    <td className="py-3 pr-6 font-medium text-slate-800 whitespace-nowrap">
                      {row.name}
                    </td>
                    <td className="py-3 pr-6 text-slate-500 tabular-nums whitespace-nowrap">
                      {row.date}
                    </td>
                    <GoalActualCell goal={row.goalDials} actual={row.actualDials} />
                    <GoalActualCell
                      goal={row.goalProspects}
                      actual={row.actualProspects}
                    />
                    <GoalActualCell
                      goal={row.goalSetsNewBiz}
                      actual={row.actualSetsNewBiz}
                    />
                    <GoalActualCell
                      goal={row.goalSetsExpansion}
                      actual={row.actualSetsExpansion}
                    />
                    <GoalActualCell
                      goal={row.goalSetsTotal}
                      actual={row.actualSetsTotal}
                    />
                    <GoalActualCell goal={row.goalSQOs} actual={row.actualSQOs} />
                    <td className="max-w-xs border-l border-slate-100 py-3 pl-6 align-top text-slate-600">
                      {row.focusText}
                    </td>
                  </tr>
                ),
              )}
              {goalRowsWithEntry.length > 0 && (
                <tr className="border-t-2 border-slate-200 bg-slate-100">
                  <td className="py-3 pr-6 font-semibold text-slate-900 whitespace-nowrap">
                    Team Total
                  </td>
                  <td className="py-3 pr-6 text-xs text-slate-400 whitespace-nowrap">
                    latest per rep
                  </td>
                  <GoalActualCell
                    goal={goalRowTotals.goalDials}
                    actual={goalRowTotals.actualDials}
                  />
                  <GoalActualCell
                    goal={goalRowTotals.goalProspects}
                    actual={goalRowTotals.actualProspects}
                  />
                  <GoalActualCell
                    goal={goalRowTotals.goalSetsNewBiz}
                    actual={goalRowTotals.actualSetsNewBiz}
                  />
                  <GoalActualCell
                    goal={goalRowTotals.goalSetsExpansion}
                    actual={goalRowTotals.actualSetsExpansion}
                  />
                  <GoalActualCell
                    goal={goalRowTotals.goalSetsTotal}
                    actual={goalRowTotals.actualSetsTotal}
                  />
                  <GoalActualCell
                    goal={goalRowTotals.goalSQOs}
                    actual={goalRowTotals.actualSQOs}
                  />
                  <td className="border-l border-slate-100 py-3 pl-6 text-slate-400">
                    —
                  </td>
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
