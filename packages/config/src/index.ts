import { z } from "zod";

export const webConfigSchema = z.object({
  apiBaseUrl: z.string().url(),
});

export function getWebConfig() {
  const meta = import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  };
  return webConfigSchema.parse({
    apiBaseUrl: meta.env?.VITE_API_BASE_URL ?? "http://localhost:8080",
  });
}
