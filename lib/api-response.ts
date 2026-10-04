import { NextResponse } from "next/server";
import { SalonServiceError } from "@/lib/services/salon-service";
import { SalonRepositoryError } from "@/lib/repositories/salon-repository";

export function apiError(error: unknown) {
  if (error instanceof SalonServiceError || error instanceof SalonRepositoryError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  console.error("Administrative API error:", error);
  return NextResponse.json({ message: "Não foi possível salvar. Tente novamente." }, { status: 500 });
}

export async function parseJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new SalonServiceError("Confira os dados informados.");
  }
}