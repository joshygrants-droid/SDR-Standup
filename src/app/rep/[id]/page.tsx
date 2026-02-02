import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MIN_DIALS, MIN_NEW_PROSPECTS } from "@/lib/constants";
import { todayISO, yesterdayISO } from "@/lib/date";
import { saveActuals, saveGoals } from "@/app/actions";

export const dynamic = "force-dynamic";

type RepPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ saved?: string }>;
};

export default async function RepStandupPage({ params, searchParams }: RepPageProps) {
  const { id } = await params;
  if (!id) return notFound();
  const resolvedSearch = searchParams ? await searchParams : {};
  const saved = resolvedSearch?.saved;

  const decoded = decodeURIComponent(id);
  let user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    user = await prisma.user.findUnique({ where: { name: decoded } });
  }

  if (!user) {
    const reps = await prisma.user.findMany({ orderBy: { name: "asc" } });
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Rep Not Found</h1>
        <p className="mt-2 text-sm text-slate-600">
          We couldn’t match this URL to a rep. Try selecting again from the
          list.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {reps.map((rep) => (
            <a
              key={rep.id}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              href={`/rep/${rep.id}`}
            >
              {rep.name}
            </a>
          ))}
        </div>
      </div>
    );
  }
  if (!user) return notFound();

  const today = todayISO();
  const yesterday = yesterdayISO();

  const [todayEntry, yesterdayEntry] = await Promise.all([
    prisma.dailyEntry.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    }),
    prisma.dailyEntry.findUnique({
      where: { userId_date: { userId: user.id, date: yesterday } },
    }),
  ]);

  const goalDials = todayEntry?.goalDials ?? "";
  const goalProspects = todayEntry?.goalNewProspects ?? "";
  const goalSetsTotal = todayEntry?.goalSetsTotal ?? "";
  const goalSetsNewBiz = todayEntry?.goalSetsNewBiz ?? "";
  const goalSetsExpansion = todayEntry?.goalSetsExpansion ?? "";
  const goalSQOs = todayEntry?.goalSQOs ?? "";
  const focusText = todayEntry?.focusText ?? "";

  const actualDials = yesterdayEntry?.actualDials ?? "";
  const actualProspects = yesterdayEntry?.actualNewProspects ?? "";
  const actualSetsNewBiz = yesterdayEntry?.actualSetsNewBiz ?? "";
  const actualSetsExpansion = yesterdayEntry?.actualSetsExpansion ?? "";
  const actualSQOs = yesterdayEntry?.actualSQOs ?? "";
  const wins = yesterdayEntry?.wins ?? "";
  const blockers = yesterdayEntry?.blockers ?? "";
  const notes = yesterdayEntry?.notes ?? "";

  const goalDialsBelow = typeof goalDials === "number" && goalDials < MIN_DIALS;
  const goalProspectsBelow =
    typeof goalProspects === "number" && goalProspects < MIN_NEW_PROSPECTS;

  const metDials = typeof actualDials === "number" && actualDials >= MIN_DIALS;
  const metProspects =
    typeof actualProspects === "number" &&
    actualProspects >= MIN_NEW_PROSPECTS;

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Rep Standup
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{user.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Today: {today} · Yesterday: {yesterday}
        </p>
        <div className="mt-4">
          <a
            href={`/rep/${user.id}/history`}
            className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Edit Past Entries
          </a>
        </div>
      </header>
      {saved && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {saved === "goals"
            ? "Today’s goals saved successfully."
            : "Yesterday’s actuals saved successfully."}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <form
          action={saveGoals}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="date" value={today} />
          <input type="hidden" name="redirectTo" value={`/rep/${user.id}`} />

          <h2 className="text-lg font-semibold text-slate-900">Today’s Plan</h2>
          <p className="mt-1 text-sm text-slate-600">
            Minimum standards: {MIN_DIALS} dials, {MIN_NEW_PROSPECTS} new
            prospects.
          </p>

          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Goal: Dials
              <input
                name="goalDials"
                type="number"
                min="0"
                defaultValue={goalDials}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {goalDialsBelow && (
                <span className="mt-1 block text-xs text-amber-600">
                  Below minimum standard. You can still save.
                </span>
              )}
            </label>

            <label className="text-sm font-medium text-slate-700">
              Goal: New Prospects Added to Sequences
              <input
                name="goalNewProspects"
                type="number"
                min="0"
                defaultValue={goalProspects}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {goalProspectsBelow && (
                <span className="mt-1 block text-xs text-amber-600">
                  Below minimum standard. You can still save.
                </span>
              )}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Goal: Sets (Total)
                <input
                  name="goalSetsTotal"
                  type="number"
                  min="0"
                  defaultValue={goalSetsTotal}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Goal: SQOs
                <input
                  name="goalSQOs"
                  type="number"
                  min="0"
                  defaultValue={goalSQOs}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Goal: New Biz Sets
                <input
                  name="goalSetsNewBiz"
                  type="number"
                  min="0"
                  defaultValue={goalSetsNewBiz}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Goal: Expansion Sets
                <input
                  name="goalSetsExpansion"
                  type="number"
                  min="0"
                  defaultValue={goalSetsExpansion}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="text-sm font-medium text-slate-700">
              Target Focus: Brands / Campaigns
              <textarea
                name="focusText"
                defaultValue={focusText}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Save Today’s Goals
          </button>
        </form>

        <form
          action={saveActuals}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="date" value={yesterday} />
          <input type="hidden" name="redirectTo" value={`/rep/${user.id}`} />

          <h2 className="text-lg font-semibold text-slate-900">
            Yesterday’s Attainment
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Capture actuals from {yesterday}.
          </p>

          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Actual: Dials
              <input
                name="actualDials"
                type="number"
                min="0"
                defaultValue={actualDials}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {typeof actualDials === "number" && (
                <span
                  className={`mt-1 block text-xs ${
                    metDials ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {metDials
                    ? "Met minimum."
                    : "Below minimum. You can still save."}
                </span>
              )}
            </label>

            <label className="text-sm font-medium text-slate-700">
              Actual: New Prospects Added to Sequences
              <input
                name="actualNewProspects"
                type="number"
                min="0"
                defaultValue={actualProspects}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {typeof actualProspects === "number" && (
                <span
                  className={`mt-1 block text-xs ${
                    metProspects ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {metProspects
                    ? "Met minimum."
                    : "Below minimum. You can still save."}
                </span>
              )}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Actual: New Biz Sets
                <input
                  name="actualSetsNewBiz"
                  type="number"
                  min="0"
                  defaultValue={actualSetsNewBiz}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Actual: Expansion Sets
                <input
                  name="actualSetsExpansion"
                  type="number"
                  min="0"
                  defaultValue={actualSetsExpansion}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="text-sm font-medium text-slate-700">
              Actual: SQOs
              <input
                name="actualSQOs"
                type="number"
                min="0"
                defaultValue={actualSQOs}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Wins
              <textarea
                name="wins"
                defaultValue={wins}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Blockers
              <textarea
                name="blockers"
                defaultValue={blockers}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Notes (optional)
              <textarea
                name="notes"
                defaultValue={notes}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-5 w-full rounded-lg border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-900 hover:text-white"
          >
            Save Yesterday’s Actuals
          </button>
        </form>
      </section>
    </div>
  );
}
