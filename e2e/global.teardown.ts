import { execFileSync } from "node:child_process";

export default async function globalTeardown() {
  execFileSync(
    "docker",
    [
      "compose",
      "-f",
      "infra/docker/docker-compose.yml",
      "down",
      "--remove-orphans",
      "-v",
    ],
    {
      cwd: process.cwd(),
      stdio: "inherit",
    },
  );
}
