import { z } from "zod";

declare global {
  interface ImportMeta {
    readonly env?: {
      readonly VITE_API_BASE_URL?: string;
    };
  }
}

export const webConfigSchema = z.object({
  apiBaseUrl: z.string().url(),
});

export function getWebConfig() {
  return webConfigSchema.parse({
    apiBaseUrl: import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:8080",
  });
}
