import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getSalonData } from "@/lib/services/salon-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getSalonData();
    const categories = data.categories.filter((category) => category.active).sort((left, right) => left.sortOrder - right.sortOrder);
    const categoryIds = new Set(categories.map((category) => category.id));

    return NextResponse.json({
      settings: data.settings,
      categories,
      services: data.services.filter((service) => service.active && categoryIds.has(service.categoryId)).sort((left, right) => left.sortOrder - right.sortOrder),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}