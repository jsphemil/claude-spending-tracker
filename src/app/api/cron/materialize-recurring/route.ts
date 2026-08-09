import { NextResponse, type NextRequest } from "next/server";
import { ensureMaterializedForAllUsers } from "@/lib/services/recurrence";

// Backstop only — lazy materialization on page load is the primary
// mechanism (see build plan 1.6). Vercel's Hobby tier caps cron at once a
// day, which is why this exists purely to keep the horizon fresh for users
// who haven't opened the app recently, not as the main driver.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  await ensureMaterializedForAllUsers();

  return NextResponse.json({ ok: true });
}
