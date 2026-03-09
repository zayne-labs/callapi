import { twJoin, twMerge } from "tailwind-merge";

export const cnMerge: typeof twMerge = (...classNames) => twMerge(classNames);

export const cnJoin: typeof twJoin = (...classNames) => twJoin(classNames);
