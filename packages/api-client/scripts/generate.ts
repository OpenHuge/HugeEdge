import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const spec = readFileSync(resolve("../../openapi/admin.yaml"), "utf8");
const out = resolve("src/generated/openapi.ts");
const escapedSpec = spec
  .replaceAll("\\", "\\\\")
  .replaceAll("`", "\\`")
  .replaceAll("${", "\\${");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `export const adminOpenApi = \`\n${escapedSpec}\`;\n`);
console.log("generated packages/api-client/src/generated/openapi.ts");
