import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getSalonData } from "@/lib/services/salon-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getSalonData(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}