import "server-only";

/**
 * Server-only IBM watsonx.ai Granite client.
 *
 * Never throws to the caller: every failure (missing env, network error,
 * timeout, bad response shape) resolves to `null` so pages/routes can
 * degrade gracefully instead of erroring. The IBM Cloud account closes
 * shortly after the hackathon, so callers must always have a recorded
 * fallback ready.
 */

const IAM_TOKEN_URL = "https://iam.cloud.ibm.com/identity/token";
const REQUEST_TIMEOUT_MS = 20_000;
const TOKEN_EXPIRY_SAFETY_MS = 5 * 60 * 1000; // refresh 5 min before expiry

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

let cachedToken: { accessToken: string; expiresAtMs: number } | null = null;

function isConfigured(): boolean {
  return Boolean(
    process.env.WATSONX_API_KEY &&
      process.env.WATSONX_PROJECT_ID &&
      process.env.WATSONX_URL &&
      process.env.WATSONX_MODEL_ID,
  );
}

async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getAccessToken(apiKey: string): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs - TOKEN_EXPIRY_SAFETY_MS > now) {
    return cachedToken.accessToken;
  }

  try {
    const res = await fetchWithTimeout(IAM_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ibm:params:oauth:grant-type:apikey",
        apikey: apiKey,
      }),
    });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    const accessToken =
      data && typeof data === "object" && "access_token" in data
        ? (data as { access_token: unknown }).access_token
        : undefined;
    const expiresIn =
      data && typeof data === "object" && "expires_in" in data
        ? (data as { expires_in: unknown }).expires_in
        : undefined;

    if (typeof accessToken !== "string" || typeof expiresIn !== "number") return null;

    cachedToken = { accessToken, expiresAtMs: now + expiresIn * 1000 };
    return accessToken;
  } catch {
    return null;
  }
}

/**
 * Sends a chat completion request to Granite. Returns the assistant's
 * message content, or `null` on any failure (never throws).
 */
export async function watsonxChat(
  messages: ChatMessage[],
  opts: { maxTokens?: number } = {},
): Promise<string | null> {
  if (!isConfigured()) return null;

  const apiKey = process.env.WATSONX_API_KEY!;
  const projectId = process.env.WATSONX_PROJECT_ID!;
  const baseUrl = process.env.WATSONX_URL!;
  const modelId = process.env.WATSONX_MODEL_ID!;

  try {
    const token = await getAccessToken(apiKey);
    if (!token) return null;

    const res = await fetchWithTimeout(`${baseUrl}/ml/v1/text/chat?version=2024-10-08`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model_id: modelId,
        project_id: projectId,
        messages,
        max_tokens: opts.maxTokens ?? 800,
      }),
    });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    const choices =
      data && typeof data === "object" && "choices" in data
        ? (data as { choices: unknown }).choices
        : undefined;
    if (!Array.isArray(choices) || choices.length === 0) return null;

    const content = choices[0]?.message?.content;
    return typeof content === "string" ? content : null;
  } catch {
    return null;
  }
}

/** Whether WATSONX_* env vars are present (does not verify they're valid). */
export function isWatsonxConfigured(): boolean {
  return isConfigured();
}

/** The configured Granite model id, or `null` if not configured. */
export function getWatsonxModelId(): string | null {
  return process.env.WATSONX_MODEL_ID ?? null;
}
