import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getDashboardSummary, getSalonData } from "@/lib/services/salon-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getSalonData();
    const today = new Intl.DateTimeFormat("en-CA").format(new Date());
    return NextResponse.json(getDashboardSummary(data, today), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}