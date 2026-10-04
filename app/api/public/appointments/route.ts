import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api-response";
import { createAppointment } from "@/lib/services/salon-service";

export async function POST(request: Request) {
  try {
    const appointment = await createAppointment(await parseJson(request));
    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}