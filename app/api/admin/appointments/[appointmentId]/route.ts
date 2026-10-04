import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api-response";
import { updateAppointment } from "@/lib/services/salon-service";

type Context = { params: Promise<{ appointmentId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { appointmentId } = await context.params;
    const body = await parseJson(request) as Parameters<typeof updateAppointment>[1];
    return NextResponse.json(await updateAppointment(appointmentId, body));
  } catch (error) {
    return apiError(error);
  }
}