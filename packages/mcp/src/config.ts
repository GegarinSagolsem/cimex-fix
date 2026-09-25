import * as fs from "node:fs";

export interface Config {
  apiUrl: string;
  ingestToken: string;
}

/** Parse a simple KEY=VALUE dotenv file (no shell expansion, no comments with values). */
function parseDotenv(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  let text: string;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch {
    return result;
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip optional surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}

export function loadConfig(): Config {
  // If an env file is specified, load it first (process.env takes precedence)
  const envFile = process.env["BUGPROOF_ENV_FILE"];
  if (envFile) {
    const parsed = parseDotenv(envFile);
    for (const [k, v] of Object.entries(parsed)) {
      if (!(k in process.env)) {
        process.env[k] = v;
      }
    }
  }

  const apiUrl = process.env["BUGPROOF_API_URL"];
  const ingestToken = process.env["BUGPROOF_INGEST_TOKEN"];

  if (!apiUrl) throw new Error("BUGPROOF_API_URL is not set");
  if (!ingestToken) throw new Error("BUGPROOF_INGEST_TOKEN is not set");

  return { apiUrl: apiUrl.replace(/\/$/, ""), ingestToken };
}
