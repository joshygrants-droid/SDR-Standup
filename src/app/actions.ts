"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash } from "crypto";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isManagerAuthed } from "@/lib/auth";
import { MANAGER_COOKIE } from "@/lib/constants";

const MANAGER_SETTINGS_KEY = "manager";
const PIN_REGEX = /^\d{4,12}$/;

function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

async function getStoredPinHash(): Promise<string | null> {
  const settings = await prisma.managerSettings.findUnique({
    where: { key: MANAGER_SETTINGS_KEY },
  });
  return settings?.pinHash ?? null;
}

function parseIntField(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.floor(number);
}

export async function selectRep(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  if (!userId) {
    redirect("/");
  }
  redirect(`/rep/${userId}`);
}

export async function managerLogin(formData: FormData) {
  const pin = String(formData.get("pin") || "").trim();
  const expected = process.env.MANAGER_PIN || "";
  const storedHash = await getStoredPinHash();

  if (storedHash && pin && hashPin(pin) === storedHash) {
    const store = await cookies();
    store.set(MANAGER_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    redirect("/manager");
  }

  if (!storedHash && pin && expected && pin === expected) {
    await prisma.managerSettings.upsert({
      where: { key: MANAGER_SETTINGS_KEY },
      update: { pinHash: hashPin(expected) },
      create: { key: MANAGER_SETTINGS_KEY, pinHash: hashPin(expected) },
    });
    const store = await cookies();
    store.set(MANAGER_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    redirect("/manager");
  }

  if (!storedHash && pin && !expected) {
    if (!PIN_REGEX.test(pin)) {
      redirect("/manager?error=invalid");
    }

    await prisma.managerSettings.upsert({
      where: { key: MANAGER_SETTINGS_KEY },
      update: { pinHash: hashPin(pin) },
      create: { key: MANAGER_SETTINGS_KEY, pinHash: hashPin(pin) },
    });

    const store = await cookies();
    store.set(MANAGER_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    redirect("/manager");
  }

  redirect("/manager?error=invalid");
}

export async function managerLogout() {
  const store = await cookies();
  store.delete(MANAGER_COOKIE);
  redirect("/");
}

export async function updateManagerPin(formData: FormData) {
  const authed = await isManagerAuthed();
  if (!authed) {
    redirect("/manager");
  }

  const newPin = String(formData.get("newPin") || "").trim();
  const confirmPin = String(formData.get("confirmPin") || "").trim();

  if (!PIN_REGEX.test(newPin)) {
    redirect("/manager?pin=invalid");
  }

  if (newPin !== confirmPin) {
    redirect("/manager?pin=mismatch");
  }

  await prisma.managerSettings.upsert({
    where: { key: MANAGER_SETTINGS_KEY },
    update: { pinHash: hashPin(newPin) },
    create: { key: MANAGER_SETTINGS_KEY, pinHash: hashPin(newPin) },
  });

  redirect("/manager?pin=updated");
}

export async function addRep(formData: FormData) {
  const authed = await isManagerAuthed();
  if (!authed) {
    redirect("/manager");
  }

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    redirect("/manager?error=missing");
  }

  try {
    await prisma.user.create({
      data: { name, role: Role.SDR },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect("/manager?error=duplicate");
    }
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/manager");
  revalidatePath("/dashboard");
  redirect("/manager?added=1");
}

export async function deleteRep(formData: FormData) {
  const authed = await isManagerAuthed();
  if (!authed) {
    redirect("/manager");
  }

  const userId = String(formData.get("userId") || "");
  if (!userId) {
    redirect("/manager?error=missing");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  revalidatePath("/");
  revalidatePath("/manager");
  revalidatePath("/dashboard");
  redirect("/manager?deleted=1");
}

export async function saveGoals(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  const date = String(formData.get("date") || "");
  const redirectTo = String(formData.get("redirectTo") || "");

  if (!userId || !date) return;

  const data = {
    goalDials: parseIntField(formData.get("goalDials")),
    goalNewProspects: parseIntField(formData.get("goalNewProspects")),
    goalSetsTotal: parseIntField(formData.get("goalSetsTotal")),
    goalSetsNewBiz: parseIntField(formData.get("goalSetsNewBiz")),
    goalSetsExpansion: parseIntField(formData.get("goalSetsExpansion")),
    goalSQOs: parseIntField(formData.get("goalSQOs")),
    focusText: String(formData.get("focusText") || "").trim() || null,
  };

  await prisma.dailyEntry.upsert({
    where: { userId_date: { userId, date } },
    update: data,
    create: {
      userId,
      date,
      ...data,
    },
  });

  revalidatePath(`/rep/${userId}`);
  if (redirectTo) {
    redirect(`${redirectTo}?saved=goals`);
  }
}

export async function saveActuals(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  const date = String(formData.get("date") || "");
  const redirectTo = String(formData.get("redirectTo") || "");

  if (!userId || !date) return;

  const data = {
    actualDials: parseIntField(formData.get("actualDials")),
    actualNewProspects: parseIntField(formData.get("actualNewProspects")),
    actualSetsNewBiz: parseIntField(formData.get("actualSetsNewBiz")),
    actualSetsExpansion: parseIntField(formData.get("actualSetsExpansion")),
    actualSQOs: parseIntField(formData.get("actualSQOs")),
    wins: String(formData.get("wins") || "").trim() || null,
    blockers: String(formData.get("blockers") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
  };

  await prisma.dailyEntry.upsert({
    where: { userId_date: { userId, date } },
    update: data,
    create: {
      userId,
      date,
      ...data,
    },
  });

  revalidatePath(`/rep/${userId}`);
  if (redirectTo) {
    redirect(`${redirectTo}?saved=actuals`);
  }
}

export async function saveStandup(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  const todayDate = String(formData.get("todayDate") || "");
  const yesterdayDate = String(formData.get("yesterdayDate") || "");
  const redirectTo = String(formData.get("redirectTo") || "");

  if (!userId || !todayDate || !yesterdayDate) return;

  const goalsData = {
    goalDials: parseIntField(formData.get("goalDials")),
    goalNewProspects: parseIntField(formData.get("goalNewProspects")),
    goalSetsTotal: parseIntField(formData.get("goalSetsTotal")),
    goalSetsNewBiz: parseIntField(formData.get("goalSetsNewBiz")),
    goalSetsExpansion: parseIntField(formData.get("goalSetsExpansion")),
    goalSQOs: parseIntField(formData.get("goalSQOs")),
    focusText: String(formData.get("focusText") || "").trim() || null,
  };

  const actualsData = {
    actualDials: parseIntField(formData.get("actualDials")),
    actualNewProspects: parseIntField(formData.get("actualNewProspects")),
    actualSetsNewBiz: parseIntField(formData.get("actualSetsNewBiz")),
    actualSetsExpansion: parseIntField(formData.get("actualSetsExpansion")),
    actualSQOs: parseIntField(formData.get("actualSQOs")),
    wins: String(formData.get("wins") || "").trim() || null,
    blockers: String(formData.get("blockers") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
  };

  await prisma.dailyEntry.upsert({
    where: { userId_date: { userId, date: todayDate } },
    update: goalsData,
    create: {
      userId,
      date: todayDate,
      ...goalsData,
    },
  });

  await prisma.dailyEntry.upsert({
    where: { userId_date: { userId, date: yesterdayDate } },
    update: actualsData,
    create: {
      userId,
      date: yesterdayDate,
      ...actualsData,
    },
  });

  revalidatePath(`/rep/${userId}`);
  if (redirectTo) {
    redirect(`${redirectTo}?saved=standup`);
  }
}
