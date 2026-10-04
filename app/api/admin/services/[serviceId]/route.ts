import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api-response";
import { deleteService, saveService } from "@/lib/services/salon-service";
import type { Service } from "@/lib/types";

type Context = { params: Promise<{ serviceId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { serviceId } = await context.params;
    const data = await saveService(await parseJson(request) as Partial<Service>, serviceId);
    return NextResponse.json(data.services.find((service) => service.id === serviceId));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { serviceId } = await context.params;
    await deleteService(serviceId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}