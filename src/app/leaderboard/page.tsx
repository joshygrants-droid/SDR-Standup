import { redirect } from "next/navigation";

export default function LeaderboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const query = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === "string") query.set(key, value);
    }
  }
  const suffix = query.toString();
  redirect(`/dashboard${suffix ? `?${suffix}` : ""}`);
}
