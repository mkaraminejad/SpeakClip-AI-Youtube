# SpeakClip AI

**SpeakClip AI** transforms short English speeches, interviews, and podcast segments into educational YouTube clips with bilingual Persian explanations, idiom breakdowns, interactive quizzes, dual English/Persian subtitles, and full YouTube SEO metadata.

---

## 🐳 Docker Deployment & Testing Guide

You can easily package and run SpeakClip AI in an isolated container using Docker or Docker Compose.

### Prerequisites
- [Docker Engine](https://docs.docker.com/engine/install/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.0+)

---

### Option 1: Quick Start with Docker Compose (Recommended)

Docker Compose configures port mappings, production environment settings, and host network routing automatically.

1. **Clone the repository and navigate into the project directory:**
   ```bash
   cd speakclip-ai
   ```

2. **(Optional) Configure environment variables:**
   Create a `.env` file from the provided template:
   ```bash
   cp .env.example .env
   ```
   Add your API keys if using cloud providers (such as `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`).

3. **Build and start the container in the background:**
   ```bash
   docker compose up --build -d
   ```

4. **View live container logs:**
   ```bash
   docker compose logs -f
   ```

5. **Stop and tear down the container:**
   ```bash
   docker compose down
   ```

---

### Option 2: Using the Docker CLI Directly

If you prefer building and executing standard Docker commands:

1. **Build the production Docker image:**
   ```bash
   docker build -t speakclip-ai:latest .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name speakclip-ai \
     -p 3000:3000 \
     -e PORT=3000 \
     -e NODE_ENV=production \
     -e GEMINI_API_KEY="your-gemini-api-key-here" \
     --add-host=host.docker.internal:host-gateway \
     speakclip-ai:latest
   ```

---

### 🔍 Verifying & Testing the Container

1. **Check container health and status:**
   ```bash
   docker ps
   ```
   Verify that the `speakclip-ai` container status shows `Up` and `(healthy)`.

2. **Test the backend health check endpoint:**
   ```bash
   curl http://localhost:3000/api/health
   # Expected JSON output:
   # {"status":"ok","version":"1.0.0","geminiConfigured":true,...}
   ```

3. **Access the application:**
   Open your browser and navigate to:
   **[http://localhost:3000](http://localhost:3000)**

---

### 🧠 Connecting to Local LLMs (Ollama) from Inside Docker

When running SpeakClip AI inside Docker and Ollama on your host machine:

1. **Start Ollama on your host machine allowing incoming connections:**
   ```bash
   OLLAMA_ORIGINS="*" OLLAMA_HOST="0.0.0.0" ollama serve
   ```

2. **Point SpeakClip AI to the host gateway:**
   - Inside the Docker container, `localhost` refers to the container itself. Use `host.docker.internal` to reach your host's Ollama instance:
     ```text
     http://host.docker.internal:11434/v1
     ```
   - In the SpeakClip AI UI, open the **AI Model Settings** modal (from the header bar), select **Local LLM (Ollama)**, set the Base URL to `http://host.docker.internal:11434/v1`, and click **Test Connection**.

### ⚡ Using Groq Cloud (Ultra-Fast LPU Inference)

SpeakClip AI natively supports **[Groq Cloud](https://groq.com)** to achieve blazing fast (~500-800 tokens/sec) transcription segmentation, Persian idiom extraction, and quiz generation using Meta Llama 3.3 and Mixtral models.

1. **Obtain a free Groq API Key:**
   - Sign in at **[console.groq.com/keys](https://console.groq.com/keys)** and generate an API key (starts with `gsk_...`).

2. **Configure Groq in SpeakClip AI:**
   - **Via the UI:** Open the **AI Model Settings** modal from the header bar, select **Groq Cloud**, enter your `gsk_...` key, choose a model (such as `llama-3.3-70b-versatile`), and click **Test Connection**.
   - **Via Environment Variable:** Add `GROQ_API_KEY=gsk_...` to your `.env` or Docker environment, or set `AI_PROVIDER=groq` and `AI_MODEL=llama-3.3-70b-versatile`.

---

## 🛠️ Local Development (Without Docker)

If you prefer running the project directly with Node.js:

```bash
# Install dependencies
npm install

# Start full-stack development server with hot reloading (port 3000)
npm run dev

# Lint TypeScript files
npm run lint

# Build production bundle
npm run build

# Run production server
npm start
```

---

## ⚙️ Environment Variables

Refer to `.env.example` for all configurable variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Web server listening port | `3000` |
| `NODE_ENV` | Runtime environment (`development` or `production`) | `production` |
| `GEMINI_API_KEY` | Google Gemini API key (recommended) | None |
| `GROQ_API_KEY` | Groq Cloud API key for Llama 3.3 / LPU inference | None |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o / GPT-4o Mini | None |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude 3.5 Sonnet | None |
| `LOCAL_LLM_BASE_URL` | Base URL for private Ollama / LM Studio / vLLM | `http://localhost:11434/v1` |
| `LOCAL_LLM_MODEL` | Default local model name (e.g. `llama3.2`, `qwen2.5`) | `llama3.2` |
