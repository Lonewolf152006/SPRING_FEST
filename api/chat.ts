export default async function handler(req: any, res: any) {
  // Allow GET test
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, message: "Groq API running ✅" });
  }

  // Only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const message = req.body?.message;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY not set in Vercel" });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: message }],
        temperature: 0.7,
      }),
    });

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content || "";

    return res.status(200).json({ reply });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
