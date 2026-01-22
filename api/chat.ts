export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not set" });
    }

    // This payload comes from frontend (message / contents / config etc.)
    const payload = req.body;

    // If user sent only {message:"hi"}, convert to Gemini format
    const body =
      payload?.message
        ? {
            contents: [{ role: "user", parts: [{ text: payload.message }] }],
          }
        : payload;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No reply";

    return res.status(200).json({ reply, raw: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}

