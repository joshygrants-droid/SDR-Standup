import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isManagerAuthed } from "@/lib/auth";
import { addDaysISO, listISODateRange, isWeekday, todayISO } from "@/lib/date";

export default async function ManagerRepDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isManagerAuthed())) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Manager Access</h1>
        <p className="mt-2 text-sm text-slate-600">
          Please enter the manager PIN on the manager hub page.
        </p>
        <Link
          href="/manager"
          className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Go to Manager Hub
        </Link>
      </div>
    );
  }

  const { id } = await params;
  if (!id) return notFound();

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return notFound();

  const end = todayISO();
  const start = addDaysISO(end, -30);
  const entries = await prisma.dailyEntry.findMany({
    where: { userId: user.id, date: { gte: start, lte: end } },
    orderBy: { date: "desc" },
  });

  const last14Start = addDaysISO(end, -13);
  const last14Dates = listISODateRange(last14Start, end).filter(isWeekday);
  const missingDates = last14Dates.filter(
    (date) => !entries.some((entry) => entry.date === date)
  );

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Rep Detail
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {user.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Last 30 days ({start} to {end})
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Missing Entries</h2>
        <p className="mt-1 text-sm text-slate-600">
          Weekdays in the last 14 days without a standup.
        </p>
        {missingDates.length === 0 ? (
          <p className="mt-3 text-sm text-emerald-600">
            No missing entries in the last 14 days.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {missingDates.map((date) => (
              <span
                key={date}
                className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700"
              >
                {date}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Goals vs Actuals
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">Goal Dials</th>
                <th className="py-2">Actual Dials</th>
                <th className="py-2">Goal Prospects</th>
                <th className="py-2">Actual Prospects</th>
                <th className="py-2">Goal Sets</th>
                <th className="py-2">Actual Sets</th>
                <th className="py-2">Goal SQOs</th>
                <th className="py-2">Actual SQOs</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={9}>
                    No entries yet.
                  </td>
                </tr>
              )}
              {entries.map((entry) => {
                const actualSets =
                  (entry.actualSetsNewBiz ?? 0) +
                  (entry.actualSetsExpansion ?? 0);
                const hasActualSets =
                  entry.actualSetsNewBiz !== null ||
                  entry.actualSetsExpansion !== null;
                return (
                  <tr key={entry.id} className="border-t">
                    <td className="py-2 font-medium text-slate-700">
                      {entry.date}
                    </td>
                    <td className="py-2">{entry.goalDials ?? "-"}</td>
                    <td className="py-2">{entry.actualDials ?? "-"}</td>
                    <td className="py-2">{entry.goalNewProspects ?? "-"}</td>
                    <td className="py-2">{entry.actualNewProspects ?? "-"}</td>
                    <td className="py-2">{entry.goalSetsTotal ?? "-"}</td>
                    <td className="py-2">
                      {hasActualSets ? actualSets : "-"}
                    </td>
                    <td className="py-2">{entry.goalSQOs ?? "-"}</td>
                    <td className="py-2">{entry.actualSQOs ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
