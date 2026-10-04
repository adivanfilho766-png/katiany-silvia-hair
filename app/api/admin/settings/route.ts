import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api-response";
import { updateSettings } from "@/lib/services/salon-service";
import type { BusinessSettings } from "@/lib/types";

export async function PATCH(request: Request) {
  try {
    const settings = await updateSettings(await parseJson(request) as Partial<BusinessSettings>);
    return NextResponse.json(settings.settings);
  } catch (error) {
    return apiError(error);
  }
}