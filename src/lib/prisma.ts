import { PrismaClient, Role } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const isPreview = process.env.PREVIEW_MODE === "1";

const previewUsers = [
  { id: "preview-ava", name: "Ava Carter", role: Role.SDR },
  { id: "preview-jay", name: "Jay Patel", role: Role.SDR },
  { id: "preview-lina", name: "Lina Gomez", role: Role.SDR },
];

const previewEntries = [
  {
    id: "preview-entry-1",
    userId: "preview-ava",
    date: "2026-02-01",
    goalDials: 80,
    goalNewProspects: 12,
    goalSetsTotal: 6,
    goalSetsNewBiz: 4,
    goalSetsExpansion: 2,
    goalSQOs: 3,
    actualDials: 92,
    actualNewProspects: 14,
    actualSetsNewBiz: 4,
    actualSetsExpansion: 2,
    actualSQOs: 3,
  },
  {
    id: "preview-entry-2",
    userId: "preview-jay",
    date: "2026-02-01",
    goalDials: 75,
    goalNewProspects: 10,
    goalSetsTotal: 5,
    goalSetsNewBiz: 3,
    goalSetsExpansion: 2,
    goalSQOs: 2,
    actualDials: 71,
    actualNewProspects: 9,
    actualSetsNewBiz: 2,
    actualSetsExpansion: 1,
    actualSQOs: 2,
  },
  {
    id: "preview-entry-3",
    userId: "preview-lina",
    date: "2026-02-01",
    goalDials: 90,
    goalNewProspects: 14,
    goalSetsTotal: 7,
    goalSetsNewBiz: 5,
    goalSetsExpansion: 2,
    goalSQOs: 4,
    actualDials: 98,
    actualNewProspects: 16,
    actualSetsNewBiz: 5,
    actualSetsExpansion: 2,
    actualSQOs: 4,
  },
];

const previewPrisma = {
  user: {
    findMany: async (args?: {
      where?: { role?: Role; id?: string; name?: string };
      orderBy?: { name?: "asc" | "desc" };
      include?: { entries?: { where?: { date?: { gte?: string; lte?: string } } } };
    }) => {
      let users = [...previewUsers];
      if (args?.where?.role) {
        users = users.filter((user) => user.role === args.where?.role);
      }
      if (args?.where?.id) {
        users = users.filter((user) => user.id === args.where?.id);
      }
      if (args?.where?.name) {
        users = users.filter((user) => user.name === args.where?.name);
      }
      if (args?.orderBy?.name) {
        users.sort((a, b) =>
          args.orderBy?.name === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name),
        );
      }
      if (args?.include?.entries) {
        const gte = args.include.entries.where?.date?.gte;
        const lte = args.include.entries.where?.date?.lte;
        return users.map((user) => ({
          ...user,
          entries: previewEntries.filter((entry) => {
            if (entry.userId !== user.id) return false;
            if (gte && entry.date < gte) return false;
            if (lte && entry.date > lte) return false;
            return true;
          }),
        }));
      }
      return users;
    },
    findUnique: async (args?: { where?: { id?: string; name?: string } }) => {
      if (args?.where?.id) {
        return previewUsers.find((user) => user.id === args.where?.id) ?? null;
      }
      if (args?.where?.name) {
        return previewUsers.find((user) => user.name === args.where?.name) ?? null;
      }
      return null;
    },
    create: async ({ data }: { data: { name: string; role?: Role } }) => {
      const user = {
        id: `preview-${data.name.toLowerCase().replace(/\\s+/g, "-")}`,
        name: data.name,
        role: data.role ?? Role.SDR,
      };
      previewUsers.push(user);
      return user;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const index = previewUsers.findIndex((user) => user.id === where.id);
      if (index >= 0) {
        previewUsers.splice(index, 1);
      }
      return { id: where.id };
    },
  },
  dailyEntry: {
    findMany: async (args?: {
      where?: { date?: { gte?: string; lte?: string } };
      orderBy?: { date?: "asc" | "desc" };
    }) => {
      let entries = [...previewEntries];
      const gte = args?.where?.date?.gte;
      const lte = args?.where?.date?.lte;
      if (gte) {
        entries = entries.filter((entry) => entry.date >= gte);
      }
      if (lte) {
        entries = entries.filter((entry) => entry.date <= lte);
      }
      if (args?.orderBy?.date) {
        entries.sort((a, b) =>
          args.orderBy?.date === "asc"
            ? a.date.localeCompare(b.date)
            : b.date.localeCompare(a.date),
        );
      }
      return entries;
    },
    findUnique: async (args?: {
      where?: { userId_date?: { userId: string; date: string } };
    }) => {
      const key = args?.where?.userId_date;
      if (!key) return null;
      return (
        previewEntries.find(
          (entry) => entry.userId === key.userId && entry.date === key.date,
        ) ?? null
      );
    },
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { userId_date: { userId: string; date: string } };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const index = previewEntries.findIndex(
        (entry) =>
          entry.userId === where.userId_date.userId &&
          entry.date === where.userId_date.date,
      );
      if (index >= 0) {
        previewEntries[index] = {
          ...previewEntries[index],
          ...update,
        };
        return previewEntries[index];
      }
      const entry = {
        id: `preview-entry-${previewEntries.length + 1}`,
        ...create,
      } as (typeof previewEntries)[number];
      previewEntries.push(entry);
      return entry;
    },
  },
} as PrismaClient;

export const prisma =
  (isPreview ? previewPrisma : global.prisma) ||
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
