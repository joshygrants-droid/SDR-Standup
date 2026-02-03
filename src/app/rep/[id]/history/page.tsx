import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { todayISO, yesterdayISO } from "@/lib/date";
import { saveActuals, saveGoals } from "@/app/actions";

export const dynamic = "force-dynamic";

type HistoryPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ date?: string; section?: string; saved?: string }>;
};

export default async function RepHistoryPage({
  params,
  searchParams,
}: HistoryPageProps) {
  const { id } = await params;
  if (!id) return notFound();

  const decoded = decodeURIComponent(id);
  let user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { name: decoded } });
  }
  if (!user) return notFound();

  const resolvedSearch = searchParams ? await searchParams : {};
  const selectedDate = resolvedSearch?.date || todayISO();
  const section = resolvedSearch?.section === "actuals" ? "actuals" : "goals";
  const saved = resolvedSearch?.saved;

  const entry = await prisma.dailyEntry.findUnique({
    where: { userId_date: { userId: user.id, date: selectedDate } },
  });

  const goalDials = entry?.goalDials ?? "";
  const goalProspects = entry?.goalNewProspects ?? "";
  const goalSetsTotal = entry?.goalSetsTotal ?? "";
  const goalSetsNewBiz = entry?.goalSetsNewBiz ?? "";
  const goalSetsExpansion = entry?.goalSetsExpansion ?? "";
  const goalSQOs = entry?.goalSQOs ?? "";
  const focusText = entry?.focusText ?? "";

  const actualDials = entry?.actualDials ?? "";
  const actualProspects = entry?.actualNewProspects ?? "";
  const actualSetsNewBiz = entry?.actualSetsNewBiz ?? "";
  const actualSetsExpansion = entry?.actualSetsExpansion ?? "";
  const actualSQOs = entry?.actualSQOs ?? "";
  const wins = entry?.wins ?? "";
  const blockers = entry?.blockers ?? "";
  const notes = entry?.notes ?? "";

  const redirectTo = `/rep/${user.id}/history?date=${selectedDate}&section=${section}`;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Edit Past Entries
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {user.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose a date to update goals or actuals.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href={`/rep/${user.id}`}
            className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Today
          </Link>
          <Link
            href={`/rep/${user.id}/history?date=${todayISO()}&section=goals`}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-100"
          >
            Today’s Goals
          </Link>
          <Link
            href={`/rep/${user.id}/history?date=${yesterdayISO()}&section=actuals`}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-100"
          >
            Yesterday’s Actuals
          </Link>
        </div>
      </header>

      {saved && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {saved === "goals"
            ? "Goals saved successfully."
            : "Actuals saved successfully."}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Date
            <input
              type="date"
              name="date"
              defaultValue={selectedDate}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Section
            <select
              name="section"
              defaultValue={section}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="goals">Goals</option>
              <option value="actuals">Actuals</option>
            </select>
          </label>
          <button
            type="submit"
            className="accent-button rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Load Entry
          </button>
        </form>
      </section>

      {section === "goals" ? (
        <form
          action={saveGoals}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="date" value={selectedDate} />
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <h2 className="text-lg font-semibold text-slate-900">
            Goals for {selectedDate}
          </h2>

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
                Goal: Upsell Sets
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
            className="accent-button mt-5 w-full rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Save Goals
          </button>
        </form>
      ) : (
        <form
          action={saveActuals}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="date" value={selectedDate} />
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <h2 className="text-lg font-semibold text-slate-900">
            Actuals for {selectedDate}
          </h2>

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
                Actual: Upsell Sets
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
            className="accent-button-outline mt-5 w-full rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Save Actuals
          </button>
        </form>
      )}
    </div>
  );
}
