import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { deleteExtraSlot } from "@/lib/services/salon-service";

type Context = { params: Promise<{ extraSlotId: string }> };

export async function DELETE(_request: Request, context: Context) {
  try {
    const { extraSlotId } = await context.params;
    await deleteExtraSlot(extraSlotId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}