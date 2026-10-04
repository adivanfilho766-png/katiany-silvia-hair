import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api-response";
import { saveBlock } from "@/lib/services/salon-service";
import type { ScheduleBlock } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await parseJson(request) as Partial<ScheduleBlock>;
    const data = await saveBlock(body);
    return NextResponse.json(data.blocks.at(-1), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}