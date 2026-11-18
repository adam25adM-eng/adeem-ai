import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.AI_API_KEY;
    const baseUrl = (process.env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
    const model = process.env.AI_MODEL || "llama-3.3-70b-versatile";

    if (!apiKey) {
      return res.status(503).json({
        error: "مازال ما تربطش محرك AI. خاص صاحب الموقع يضيف AI_API_KEY في إعدادات الاستضافة."
      });
    }

    const { messages, instructions } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "ما توصلات حتى رسالة." });
    }

    const safeMessages = messages.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 8000)
    }));

    const system = [
      "أنت Adeem AI، مساعد ذكي يتحدث بالعربية والدارجة المغربية حسب لغة المستخدم.",
      "كن واضحاً ومحترماً، وصرّح عندما لا تعرف شيئاً. لا تدّعِ أنك نفذت عملاً لم تنفذه.",
      "احترم السلامة والقوانين وخصوصية المستخدم. لا تساعد على سرقة الحسابات أو البرمجيات الخبيثة أو الإضرار بالآخرين.",
      instructions ? "تعليمات صاحب الموقع الإضافية:\n" + String(instructions).slice(0, 5000) : ""
    ].filter(Boolean).join("\n\n");

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...safeMessages],
        temperature: 0.7
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "وقع مشكل مع مزود الذكاء الاصطناعي."
      });
    }

    res.json({ reply: data?.choices?.[0]?.message?.content || "ما قدرتش نولد جواب." });
  } catch (error) {
    res.status(500).json({ error: "وقع خطأ فالسيرفر. عاود المحاولة." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Adeem AI running on port ${port}`));
