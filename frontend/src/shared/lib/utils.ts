import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Resolves HTML class names by merging their names and values into a single string.
 * */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}