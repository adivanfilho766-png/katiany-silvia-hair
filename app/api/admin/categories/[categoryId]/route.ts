import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api-response";
import { deleteCategory, saveCategory } from "@/lib/services/salon-service";
import type { ServiceCategory } from "@/lib/types";

type Context = { params: Promise<{ categoryId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { categoryId } = await context.params;
    const data = await saveCategory(await parseJson(request) as Partial<ServiceCategory>, categoryId);
    return NextResponse.json(data.categories.find((category) => category.id === categoryId));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { categoryId } = await context.params;
    await deleteCategory(categoryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}