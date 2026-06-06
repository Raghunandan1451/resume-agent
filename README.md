# Resume Agent

Local AI resume tailor. No cloud, no cost, no data leaving your machine.

## Stack

- **Ollama** — local LLM inference (qwen2.5:7b or llama3.1:8b)
- **Node.js + TypeScript** — tailor script
- **React + Vite** — diff viewer UI
- **pdflatex** — PDF compilation (coming in Step 3)

---

## One-time Setup

### 1. Install Ollama model

```bash
ollama pull qwen2.5:7b
# or: ollama pull llama3.1:8b
```

### 2. Install dependencies

```bash
# Root (tailor script)
npm install

# UI
cd ui && npm install
```

---

## Folder Structure

```
resume-agent/
├── resume/
│   ├── base.json          ← YOUR master resume data (edit this, never delete)
│   └── template.tex       ← LaTeX template with {{placeholders}} (Step 3)
├── agent/
│   └── tailor.ts          ← AI tailoring script
├── ui/
│   └── src/App.tsx        ← Diff viewer
├── output/
│   ├── tailored.json      ← AI output (auto-generated)
│   └── raw_response.txt   ← Raw model output for debugging
└── jd/
    └── example.txt        ← Paste JDs here as .txt files
```

---

## Daily Workflow

### Step 1 — Paste the job description

Save it as a `.txt` file in the `jd/` folder:

```bash
# e.g. jd/company-role.txt
```

### Step 2 — Run the tailor

```bash
npm run tailor -- jd/company-role.txt
```

This calls Ollama and writes `output/tailored.json`. Takes 20–60 seconds.

### Step 3 — Review in the diff viewer

```bash
npm run ui
# Open http://localhost:3000
# Load resume/base.json and output/tailored.json
# Review every change side by side
```

### Step 4 — Approve and generate PDF (coming soon)

```bash
npm run compile     # merges tailored.json into template.tex → PDF
npm run apply       # Playwright auto-applies (Step 4)
```

---

## Tuning the AI Output

If the output isn't good enough, the first thing to tune is `agent/tailor.ts`:

- **Temperature** (`options.temperature`): lower = more conservative (try 0.2)
- **Model**: switch to `llama3.1:8b` if qwen2.5 is inconsistent
- **Prompt**: edit the `buildPrompt()` function — the RULES section is the most impactful

If the model keeps returning markdown fences despite instructions, that's normal for smaller
models. The `extractJSON()` function handles it automatically.

---

## Switching to Groq (better quality, still free)

If local quality feels weak, Groq's free tier is dramatically better:

1. Get a free API key at https://console.groq.com
2. In `agent/tailor.ts`, replace the `callOllama()` function:

```typescript
const response = await fetch(
	"https://api.groq.com/openai/v1/chat/completions",
	{
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
		},
		body: JSON.stringify({
			model: "llama-3.3-70b-versatile",
			messages: [{ role: "user", content: prompt }],
			temperature: 0.3,
		}),
	},
);
const data = await response.json();
return data.choices[0].message.content;
```

Then: `set GROQ_API_KEY=your_key_here` (Windows) before running.
