import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { managerLogin, selectRep } from "@/app/actions";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: { error?: string };
};

export default async function Home({ searchParams }: HomeProps) {
  const reps = await prisma.user.findMany({
    where: { role: Role.SDR },
    orderBy: { name: "asc" },
  });
  const showManagerError = searchParams?.error === "invalid";

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          SDR Portal
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          Daily Standup + Performance Tracker
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          Select your name to open today’s stand-up. This will load your goals
          for today and your actuals for yesterday.
        </p>

        <form action={selectRep} className="mt-6 flex flex-col gap-4 sm:flex-row">
          <select
            name="userId"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
            required
          >
            <option value="">Select your name</option>
            {reps.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="accent-button rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Continue
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Manager Access</h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter the manager PIN to view team analytics and rep history.
        </p>
        <form action={managerLogin} className="mt-4 flex flex-col gap-3">
          <input
            type="password"
            name="pin"
            placeholder="Manager PIN"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          {showManagerError && (
            <p className="text-sm text-rose-600">Invalid PIN. Try again.</p>
          )}
          <button
            type="submit"
            className="accent-button-outline rounded-lg px-3 py-2 text-sm font-semibold"
          >
            Enter Manager Hub
          </button>
        </form>
      </section>
    </div>
  );
}
