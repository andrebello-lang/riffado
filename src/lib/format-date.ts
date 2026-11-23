import {
    differenceInDays,
    format,
    formatDistanceToNow,
    isSameDay,
    isThisYear,
    isToday,
    isYesterday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateTimeFormat } from "@/types/common";

export type { DateTimeFormat };

export function formatDateTime(
    date: Date | string,
    formatType: DateTimeFormat = "relative",
): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    switch (formatType) {
        case "relative":
            return formatDistanceToNow(dateObj, {
                addSuffix: true,
                locale: ptBR,
            });
        case "absolute":
            return format(dateObj, "d 'de' MMM 'de' yyyy, HH:mm", {
                locale: ptBR,
            });
        case "iso":
            return dateObj.toISOString();
        default:
            return formatDistanceToNow(dateObj, {
                addSuffix: true,
                locale: ptBR,
            });
    }
}

/** Absolute local date and start–end time for a recording. */
export function formatRecordingDateTimeRange(
    start: Date | string,
    durationMs: number,
): string {
    const startDate = typeof start === "string" ? new Date(start) : start;
    const endDate = new Date(startDate.getTime() + durationMs);

    if (isSameDay(startDate, endDate)) {
        return `${format(startDate, "d 'de' MMM 'de' yyyy · HH:mm", { locale: ptBR })}–${format(endDate, "HH:mm")}`;
    }

    return `${format(startDate, "d 'de' MMM 'de' yyyy · HH:mm", { locale: ptBR })}–${format(endDate, "d 'de' MMM 'de' yyyy · HH:mm", { locale: ptBR })}`;
}

/** Recording-list group label: Today / Yesterday / This week / month / Month YYYY. */
export function dateGroupLabel(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isToday(d)) return "Hoje";
    if (isYesterday(d)) return "Ontem";
    const now = new Date();
    const days = differenceInDays(now, d);
    if (days >= 0 && days < 7) return "Esta semana";
    if (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
    ) {
        return "Antes, neste mês";
    }
    return isThisYear(d)
        ? format(d, "MMMM", { locale: ptBR })
        : format(d, "MMMM 'de' yyyy", { locale: ptBR });
}
