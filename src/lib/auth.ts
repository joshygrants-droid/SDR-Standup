import { cookies } from "next/headers";
import { MANAGER_COOKIE } from "@/lib/constants";

export async function isManagerAuthed(): Promise<boolean> {
  const store = await cookies();
  const cookie = store.get(MANAGER_COOKIE);
  return cookie?.value === "1";
}
