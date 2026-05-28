import type { DeepPartial } from "../types";

export const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
};

export const deepMerge = <T extends Record<string, unknown>>(base: T, patch?: DeepPartial<T>): T => {
  if (!patch) return clone(base);
  const output: Record<string, unknown> = clone(base);

  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined) return;
    const current = output[key];
    if (Array.isArray(value)) {
      if (Array.isArray(current) && value.some((item) => item && typeof item === "object" && "id" in item)) {
        const byId = new Map(current.map((item: any) => [item.id, clone(item)]));
        value.forEach((item: any) => {
          if (item?.id && byId.has(item.id)) {
            byId.set(item.id, deepMerge(byId.get(item.id), item));
          } else if (item?.id) {
            byId.set(item.id, item);
          }
        });
        output[key] = Array.from(byId.values());
      } else {
        output[key] = value;
      }
    } else if (value && typeof value === "object" && current && typeof current === "object" && !Array.isArray(current)) {
      output[key] = deepMerge(current as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      output[key] = value;
    }
  });

  return output as T;
};

export const setAtPath = <T>(target: T, path: string, value: unknown): T => {
  const output = clone(target);
  const parts = path.split(".");
  let cursor: any = output;
  for (let i = 0; i < parts.length - 1; i += 1) {
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
  return output;
};

export const getAtPath = (target: unknown, path: string): unknown => {
  return path.split(".").reduce((cursor: any, part) => cursor?.[part], target as any);
};

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const uid = (prefix = "id") => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
