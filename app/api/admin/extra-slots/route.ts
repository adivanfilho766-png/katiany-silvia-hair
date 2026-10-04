import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api-response";
import { saveExtraSlot } from "@/lib/services/salon-service";
import type { ExtraSlot } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await parseJson(request) as Partial<ExtraSlot>;
    const data = await saveExtraSlot(body);
    return NextResponse.json(data.extraSlots.at(-1), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}