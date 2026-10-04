import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api-response";
import { saveCategory } from "@/lib/services/salon-service";
import type { ServiceCategory } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await parseJson(request) as Partial<ServiceCategory>;
    const data = await saveCategory(body);
    return NextResponse.json(data.categories.find((category) => category.name === body.name), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}