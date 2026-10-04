import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api-response";
import { updateSchedule } from "@/lib/services/salon-service";

export async function PUT(request: Request) {
  try {
    const data = await updateSchedule(await parseJson(request));
    return NextResponse.json(data.scheduleRules);
  } catch (error) {
    return apiError(error);
  }
}