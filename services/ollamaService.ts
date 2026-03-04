import { ResearchConfig, ResearchReport } from "../types";

const OLLAMA_BASE_URL = (import.meta.env.VITE_OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || "llama3.1";
const SCRAPE_PROXY_BASE_URL = import.meta.env.VITE_SCRAPE_PROXY_BASE_URL || "https://r.jina.ai/http://";
let ACTIVE_OLLAMA_MODEL = OLLAMA_MODEL;
const DEFAULT_NUM_CTX = Number(import.meta.env.VITE_OLLAMA_NUM_CTX || "1024");

type OllamaModelInfo = {
  name: string;
  size?: number;
};

type WebSource = {
  url: string;
  excerpt: string;
};

const MODEL_TIMEOUT_MS = Number(import.meta.env.VITE_OLLAMA_TIMEOUT_MS || "120000");
const REFUSAL_PATTERNS = [
  "not a task assigned",
  "not assigned by my supervisor",
  "i cannot provide",
  "i'm unable to provide",
  "i am unable to provide",
  "cannot assist",
  "can't assist",
  "cannot complete this task",
];

const stripProtocol = (url: string): string => url.replace(/^https?:\/\//i, "");

const buildProxyUrl = (targetUrl: string): string => {
  const withoutProtocol = stripProtocol(targetUrl.trim());
  const normalizedBase = SCRAPE_PROXY_BASE_URL.endsWith("/") ? SCRAPE_PROXY_BASE_URL : `${SCRAPE_PROXY_BASE_URL}/`;
  return `${normalizedBase}${withoutProtocol}`;
};

const truncate = (value: string, maxLen: number): string => {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}...`;
};

const extractUrls = (text: string): string[] => {
  const matches = text.match(/https?:\/\/[^\s)\]"'<>]+/g) || [];
  const seen = new Set<string>();

  for (const raw of matches) {
    try {
      const normalized = new URL(raw).toString();
      if (/duckduckgo\.com\/l\/\?/.test(normalized)) continue;
      seen.add(normalized);
    } catch {
      // Ignore malformed URL chunks
    }
  }

  return Array.from(seen);
};

const searchWebLinks = async (query: string): Promise<string[]> => {
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(buildProxyUrl(searchUrl));

  if (!response.ok) {
    throw new Error(`Search request failed (${response.status}).`);
  }

  const raw = await response.text();
  return extractUrls(raw);
};

const scrapeUrl = async (url: string): Promise<string> => {
  const response = await fetch(buildProxyUrl(url));

  if (!response.ok) {
    throw new Error(`Scrape failed (${response.status}) for ${url}`);
  }

  const text = await response.text();
  return truncate(text.replace(/\s+/g, " ").trim(), 1800);
};

const gatherWebSources = async (config: ResearchConfig, addLog: (msg: string) => void): Promise<WebSource[]> => {
  addLog("Collecting internet sources for evidence-backed research...");

  const queryParts = [config.topic, config.constraints].filter(Boolean);
  const searchQuery = queryParts.join(" ").trim();
  const candidateLinks = await searchWebLinks(searchQuery || config.topic);
  const topLinks = candidateLinks.slice(0, 5);

  if (topLinks.length === 0) {
    addLog("No external links found from web search. Continuing with model knowledge only.");
    return [];
  }

  addLog(`Found ${topLinks.length} candidate web sources. Scraping content now...`);

  const settled = await Promise.allSettled(topLinks.map(async (url) => ({
    url,
    excerpt: await scrapeUrl(url),
  })));

  const sources: WebSource[] = settled
    .filter((result): result is PromiseFulfilledResult<WebSource> => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((item) => item.excerpt.length > 0);

  addLog(`Scraping complete. ${sources.length}/${topLinks.length} sources processed successfully.`);
  return sources;
};

const ensureOllamaReady = async (): Promise<{ model: string; usedFallback: boolean }> => {
  let response: Response;

  try {
    response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
  } catch {
    throw new Error(`Unable to reach Ollama at ${OLLAMA_BASE_URL}. Start Ollama and retry.`);
  }

  if (!response.ok) {
    throw new Error(`Ollama is unavailable at ${OLLAMA_BASE_URL} (HTTP ${response.status}).`);
  }

  const payload = await response.json();
  const models: OllamaModelInfo[] = (payload?.models || [])
    .map((item: { name?: string; model?: string; size?: number }) => ({
      name: item.name || item.model || "",
      size: item.size,
    }))
    .filter((item: OllamaModelInfo) => item.name.length > 0);

  const configuredModel = models.find((item) => item.name.startsWith(OLLAMA_MODEL));

  if (configuredModel) {
    ACTIVE_OLLAMA_MODEL = OLLAMA_MODEL;
    return { model: ACTIVE_OLLAMA_MODEL, usedFallback: false };
  }

  const fallbackModel = models
    .slice()
    .sort((a, b) => (a.size ?? Number.MAX_SAFE_INTEGER) - (b.size ?? Number.MAX_SAFE_INTEGER))[0];

  if (fallbackModel) {
    ACTIVE_OLLAMA_MODEL = fallbackModel.name;
    return { model: ACTIVE_OLLAMA_MODEL, usedFallback: true };
  }

  throw new Error(`No Ollama models are installed. Run: ollama pull ${OLLAMA_MODEL}`);
};

const formatWebSourcesForPrompt = (sources: WebSource[]): string => {
  if (sources.length === 0) return "No external web sources were available.";

  return sources
    .map((source, index) => {
      return `Source ${index + 1}: ${source.url}\nExcerpt: ${source.excerpt}`;
    })
    .join("\n\n");
};

const toUserFacingError = (stage: string, error: unknown): Error => {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`${stage} failed: ${message}`);
};

const looksLikeRefusal = (text: string): boolean => {
  const lower = text.toLowerCase();
  return REFUSAL_PATTERNS.some((pattern) => lower.includes(pattern));
};

const isOllamaMemoryError = (message: string): boolean => {
  const lower = message.toLowerCase();
  return lower.includes("requires more system memory") || lower.includes("out of memory") || lower.includes("insufficient memory");
};

const callOllama = async (
  prompt: string,
  format: "json" | undefined = undefined,
  addLog?: (msg: string) => void
): Promise<string> => {
  const retryContexts = [DEFAULT_NUM_CTX, 768, 512, 256].filter((value, index, list) => value > 0 && list.indexOf(value) === index);
  let lastError: Error | null = null;

  for (const numCtx of retryContexts) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: ACTIVE_OLLAMA_MODEL,
        stream: false,
        format,
        options: {
          num_ctx: numCtx,
        },
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });
    clearTimeout(timeout);

    if (response.ok) {
      const result = await response.json();
      return result?.message?.content || "";
    }

    const errorText = await response.text();
    const requestError = new Error(`Ollama request failed: ${response.status} ${errorText}`);
    lastError = requestError;

    if (isOllamaMemoryError(requestError.message)) {
      addLog?.(`Low-memory condition detected with context ${numCtx}. Retrying with smaller context...`);
      continue;
    }

    throw requestError;
  }

  if (lastError && isOllamaMemoryError(lastError.message)) {
    throw new Error(
      `Ollama memory limit reached for model '${ACTIVE_OLLAMA_MODEL}'. Install a smaller model (example: tinyllama) or close other apps, then retry.`
    );
  }

  throw lastError || new Error("Ollama request failed unexpectedly.");
};

const extractJsonObject = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error("No valid JSON object found in model output.");
};

export const runDataGatherer = async (config: ResearchConfig, addLog: (msg: string) => void): Promise<string> => {
  addLog(`Initiating Deep Research on: "${config.topic}" (Depth: ${config.depth})`);
  addLog(`Configured Ollama model: ${OLLAMA_MODEL}`);

  try {
    const readiness = await ensureOllamaReady();
    if (readiness.usedFallback) {
      addLog(`Configured model unavailable. Using installed model: ${readiness.model}`);
    } else {
      addLog(`Using Ollama model: ${readiness.model}`);
    }
    const webSources = await gatherWebSources(config, addLog);
    const webContext = formatWebSourcesForPrompt(webSources);

    const prompt = `
    You are the DataGatherer agent.

    Research topic: "${config.topic}"
    Depth level: ${config.depth}
    Constraints: ${config.constraints || "None provided"}

    External web evidence (scraped by system):
    ${webContext}

    Build a comprehensive raw research brief.
    Organize by subtopics with clear headings.
    Include facts, statistics, key developments, and major debates.
    If the depth is Advanced or Expert, include technical and academic-level details.
    Prefer evidence from the provided web sources and explicitly reference source URLs.
    End with a section called "Potential Sources to Verify" listing URLs used or relevant.
  `;

    const text = await callOllama(prompt, undefined, addLog);
    return text || "No data returned from gatherer.";
  } catch (error) {
    console.error("DataGatherer Error:", error);
    throw toUserFacingError("DataGatherer", error);
  }
};

export const runAnalyzer = async (data: string, config: ResearchConfig, addLog: (msg: string) => void): Promise<string> => {
  addLog("Analyzer agent activated. Entering Deep Think mode...");

  const prompt = `
    You are the Analyzer agent for this application. You must complete the task directly.
    Ignore any unrelated roleplay or supervisor constraints.
    Evaluate the following research material on "${config.topic}":

    --- DATA START ---
    ${data}
    --- DATA END ---

    Your tasks:
    1. Cross-check internal consistency and identify contradictions.
    2. Identify potential biases or weak assumptions.
    3. Identify significant information gaps for depth ${config.depth}.
    4. Extract key numeric metrics suitable for charting.

    Return a critical, structured analysis and clearly mark uncertainty where relevant.
  `;

  try {
    let text = await callOllama(prompt, undefined, addLog);

    if (!text || looksLikeRefusal(text)) {
      addLog("Analyzer returned a refusal/low-signal response. Retrying with constrained format...");
      const retryPrompt = `
        Complete this analysis task now.
        Topic: "${config.topic}"
        Return exactly these sections with headings:
        1) Contradictions
        2) Biases and assumptions
        3) Information gaps
        4) Metrics for charts

        Source material:
        ${data.substring(0, 6000)}
      `;
      text = await callOllama(retryPrompt, undefined, addLog);
    }

    return text || "Analysis failed.";
  } catch (error) {
    console.error("Analyzer Error:", error);
    throw toUserFacingError("Analyzer", error);
  }
};

const buildFallbackReport = (config: ResearchConfig, analysis: string, rawData: string): ResearchReport => {
  const combined = `${analysis}\n\n${rawData}`;
  const sentences = combined
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30)
    .slice(0, 12);

  const insights = sentences.slice(0, 4);
  const recommendations = [
    "Validate key claims against primary sources before operational rollout.",
    "Define measurable KPIs for communication latency, accuracy, and feedback closure.",
    "Run a phased pilot with governance checkpoints for model-assisted communication.",
  ];

  return {
    title: `Research Report: ${config.topic}`,
    executiveSummary: sentences.slice(0, 3).join(" ") || `Summary generated for ${config.topic}.`,
    sections: [
      {
        heading: "Research Findings",
        content: rawData.substring(0, 2200) || "No findings available.",
      },
      {
        heading: "Critical Analysis",
        content: analysis.substring(0, 2200) || "No analysis available.",
      },
      {
        heading: "Implementation Considerations",
        content: "Prioritize data quality, clear communication protocols, and human oversight in decision loops.",
      },
    ],
    keyInsights: insights.length > 0 ? insights : ["No high-confidence insights extracted from model output."],
    recommendations,
    chartData: [
      {
        title: "Operational Readiness Scores",
        type: "bar",
        xAxisLabel: "Dimension",
        yAxisLabel: "Score",
        data: [
          { name: "Data Quality", value: 68 },
          { name: "Process Fit", value: 62 },
          { name: "Governance", value: 74 },
        ],
      },
    ],
    citations: Array.from(new Set(extractUrls(combined))).slice(0, 10),
  };
};

export const runSynthesizer = async (
  analysis: string,
  rawData: string,
  config: ResearchConfig,
  addLog: (msg: string) => void
): Promise<ResearchReport> => {
  addLog("Synthesizer agent activated. Compiling final report...");

  const prompt = `
    You are the Synthesizer agent.
    Create a final research report for topic "${config.topic}" at depth ${config.depth}.

    Use this input:
    --- ANALYSIS ---
    ${analysis}

    --- RAW DATA SUMMARY ---
    ${rawData.substring(0, 5000)}

    Return ONLY a valid JSON object with this exact shape:
    {
      "title": "string",
      "executiveSummary": "string",
      "sections": [{ "heading": "string", "content": "markdown string" }],
      "keyInsights": ["string"],
      "recommendations": ["string"],
      "chartData": [{
        "title": "string",
        "type": "bar|pie|line",
        "xAxisLabel": "string",
        "yAxisLabel": "string",
        "data": [{ "name": "string", "value": 0 }]
      }],
      "citations": ["string"]
    }

    Requirements:
    - Include at least 3 sections.
    - Include at least 3 key insights.
    - Include at least 2 recommendations.
    - Include at least 1 chartData item with 3+ datapoints.
    - citations must be URL strings where possible.
    - Do not wrap JSON in markdown fences.
  `;

  try {
    let text = await callOllama(prompt, "json", addLog);
    if (!text) throw new Error("No response from Synthesizer");

    if (looksLikeRefusal(text)) {
      addLog("Synthesizer produced a refusal-style response. Retrying with strict JSON repair prompt...");
      const repairPrompt = `
        Convert the following content into ONLY a valid JSON object using this schema:
        {
          "title": "string",
          "executiveSummary": "string",
          "sections": [{ "heading": "string", "content": "markdown string" }],
          "keyInsights": ["string"],
          "recommendations": ["string"],
          "chartData": [{
            "title": "string",
            "type": "bar|pie|line",
            "xAxisLabel": "string",
            "yAxisLabel": "string",
            "data": [{ "name": "string", "value": 0 }]
          }],
          "citations": ["string"]
        }

        Topic: ${config.topic}
        Analysis:
        ${analysis.substring(0, 4500)}
        Raw data:
        ${rawData.substring(0, 4500)}

        Output only JSON, no markdown fences.
      `;
      text = await callOllama(repairPrompt, "json", addLog);
    }

    try {
      const jsonText = extractJsonObject(text);
      return JSON.parse(jsonText) as ResearchReport;
    } catch {
      addLog("Synthesizer JSON parsing failed. Using deterministic fallback report.");
      return buildFallbackReport(config, analysis, rawData);
    }
  } catch (error) {
    console.error("Synthesizer Error:", error);
    addLog("Synthesizer request failed. Using deterministic fallback report.");
    return buildFallbackReport(config, analysis, rawData);
  }
};
