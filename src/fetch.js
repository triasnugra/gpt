import { REQUEST_TIMEOUT_MS, USER_AGENT } from "./config.js";

export async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        "accept": "text/html,application/json;q=0.9,*/*;q=0.8"
      }
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return {
      requestedUrl: url,
      finalUrl: response.url,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      body,
      fetchedAt: new Date().toISOString()
    };
  } finally {
    clearTimeout(timer);
  }
}
