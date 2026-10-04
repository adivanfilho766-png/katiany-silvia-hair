import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getPublicAvailableTimes } from "@/lib/services/salon-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? "";
    const serviceIds = url.searchParams.getAll("serviceId");
    const times = serviceIds.length ? await getPublicAvailableTimes(date, serviceIds) : [];
    return NextResponse.json({ times }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}