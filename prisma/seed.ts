import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const names = ["Jean", "Kealani", "Damon", "SDR 4", "SDR 5"];

  for (const name of names) {
    await prisma.user.upsert({
      where: { name },
      update: {},
      create: {
        name,
        role: Role.SDR,
      },
    });
  }

  await prisma.user.upsert({
    where: { name: "Manager" },
    update: { role: Role.MANAGER },
    create: { name: "Manager", role: Role.MANAGER },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
