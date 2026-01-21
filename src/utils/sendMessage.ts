export const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

export async function sendMessage(text: string, timeout = 15000): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Server error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    return data.reply;
  } catch (err: any) {
    clearTimeout(id);
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
}