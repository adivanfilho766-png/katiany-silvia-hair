import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api-response";
import { deleteBlock, saveBlock } from "@/lib/services/salon-service";
import type { ScheduleBlock } from "@/lib/types";

type Context = { params: Promise<{ blockId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { blockId } = await context.params;
    const data = await saveBlock(await parseJson(request) as Partial<ScheduleBlock>, blockId);
    return NextResponse.json(data.blocks.find((block) => block.id === blockId));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { blockId } = await context.params;
    await deleteBlock(blockId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}