import { clsx, type ClassValue } from "clsx";
import { twJoin, twMerge } from "tailwind-merge";

export const cnMerge = (...classNames: ClassValue[]) => twMerge(clsx(classNames));

export const cnJoin = (...classNames: ClassValue[]) => twJoin(clsx(classNames));
