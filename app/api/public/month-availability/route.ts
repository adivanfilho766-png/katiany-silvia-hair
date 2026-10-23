import { NextResponse } from "next/server";
import { getSalonData, getAvailableTimes } from "@/lib/services/salon-service";

type DayStatus = "available" | "closed" | "full";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    const serviceIds = searchParams.getAll("serviceId");

    if (
      !Number.isInteger(year) ||
      year < 2020 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        { message: "Mês ou ano inválido." },
        { status: 400 }
      );
    }

    if (
      !serviceIds.length ||
      new Set(serviceIds).size !== serviceIds.length
    ) {
      return NextResponse.json(
        { message: "Selecione serviços válidos." },
        { status: 400 }
      );
    }

    const data = await getSalonData();
    const totalDays = daysInMonth(year, month);

    const result: Record<string, DayStatus> = {};

    for (let day = 1; day <= totalDays; day++) {
      const iso = toIsoDate(year, month, day);

      const localDate = new Date(`${iso}T12:00:00`);
      const weekday = localDate.getDay();

      const scheduleRule = data.scheduleRules.find(
        (rule) => rule.weekday === weekday
      );

      const hasExtraSlot = data.extraSlots.some(
        (slot) => slot.date === iso
      );

      const wholeDayBlocked = data.blocks.some(
        (block) =>
          block.date === iso &&
          block.wholeDay
      );

      if (
        wholeDayBlocked &&
        !hasExtraSlot
      ) {
        result[iso] = "closed";
        continue;
      }

      if (
        (!scheduleRule || !scheduleRule.enabled) &&
        !hasExtraSlot
      ) {
        result[iso] = "closed";
        continue;
      }

      const times = getAvailableTimes(
        data,
        iso,
        serviceIds
      );

      result[iso] =
        times.length > 0
          ? "available"
          : "full";
    }

    return NextResponse.json(
      { days: result },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Falha ao carregar disponibilidade mensal:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Não foi possível consultar a disponibilidade do mês.",
      },
      { status: 500 }
    );
  }
}