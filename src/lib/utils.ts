import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function calculateLoss(
  distance: number,
  expectedEfficiency: number,
  actualEfficiency: number,
  pricePerLiter: number
): number {
  const expectedFuelUsed = distance / expectedEfficiency;
  const actualFuelUsed = distance / actualEfficiency;
  const excessFuel = actualFuelUsed - expectedFuelUsed;
  return excessFuel * pricePerLiter;
}

export function calculateEfficiency(
  distance: number,
  litersUsed: number
): number {
  if (litersUsed === 0) return 0;
  return distance / litersUsed;
}

export function calculateDeviation(
  expectedEfficiency: number,
  actualEfficiency: number
): number {
  if (expectedEfficiency === 0) return 0;
  return ((actualEfficiency - expectedEfficiency) / expectedEfficiency) * 100;
}

export function getRiskStatus(deviation: number): "normal" | "warning" | "high" {
  if (deviation <= 10) return "normal";
  if (deviation <= 15) return "warning";
  return "high";
}

export function isLateEntry(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 7;
}

export function isAdminOnlyEntry(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 30;
}
