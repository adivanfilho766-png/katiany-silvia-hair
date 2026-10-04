import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api-response";
import { saveService } from "@/lib/services/salon-service";
import type { Service } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await saveService(await parseJson(request) as Partial<Service>);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}