import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Menggabungkan kelas CSS dan menyelesaikan konflik utilitas Tailwind.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
