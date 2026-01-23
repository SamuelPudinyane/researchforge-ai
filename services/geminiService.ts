import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ResearchConfig, ResearchReport } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Agent 1: DataGatherer ---
// Uses Google Search Tool to find recent and relevant information.
export const runDataGatherer = async (config: ResearchConfig, addLog: (msg: string) => void): Promise<string> => {
  addLog(`Initiating Deep Research on: "${config.topic}" (Depth: ${config.depth})`);

  const model = "gemini-3-pro-preview"; // Use Pro for better tool use
  
  const prompt = `
    You are the DataGatherer agent. Your goal is to collect comprehensive information on the topic: "${config.topic}".
    Depth Level: ${config.depth}.
    Constraints: ${config.constraints}.
    
    Use the Google Search tool to find high-quality, relevant sources. 
    Focus on finding facts, statistics, recent developments, and key debates.
    
    If the depth is "Advanced" or "Expert", look for academic sources or technical whitepapers where possible via search descriptions.
    
    Return a detailed summary of the raw data collected, organized by sub-topics. 
    Explicitly list the URLs of the sources you found.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "No data returned from gatherer.";
    
    // Extract grounding chunks if available for logs (optional visualization in future)
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      addLog(`Found ${chunks.length} grounded sources.`);
    }
    
    return text;
  } catch (error) {
    console.error("DataGatherer Error:", error);
    throw new Error("DataGatherer failed to collect data.");
  }
};

// --- Agent 2: Analyzer ---
// Uses Thinking Config for deep reasoning and bias checking.
export const runAnalyzer = async (data: string, config: ResearchConfig, addLog: (msg: string) => void): Promise<string> => {
  addLog("Analyzer agent activated. Entering Deep Think mode...");

  const model = "gemini-3-pro-preview";

  const prompt = `
    You are the Analyzer agent. Evaluate the following data collected on "${config.topic}":
    
    --- DATA START ---
    ${data}
    --- DATA END ---

    Your tasks:
    1. Cross-verify the facts. Are there contradictions?
    2. Identify potential biases in the sources.
    3. Determine if there are significant gaps in the information given the requested depth (${config.depth}).
    4. Extract key metrics and statistics that could be visualized.
    
    Provide a critical analysis of the data. 
    If gaps are found, explicitly state them.
    Highlight the most reliable insights.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 }, // Enable Deep Thinking
      },
    });

    return response.text || "Analysis failed.";
  } catch (error) {
    console.error("Analyzer Error:", error);
    throw new Error("Analyzer failed to process data.");
  }
};

// --- Agent 3: Synthesizer ---
// Uses JSON Schema to format the final report and charts.
export const runSynthesizer = async (
  analysis: string, 
  rawData: string, 
  config: ResearchConfig, 
  addLog: (msg: string) => void
): Promise<ResearchReport> => {
  addLog("Synthesizer agent activated. Compiling final report...");

  const model = "gemini-3-pro-preview"; // Pro for high quality synthesis

  // Define the schema for the report to ensure valid JSON output for the UI
  const reportSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      executiveSummary: { type: Type.STRING },
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            heading: { type: Type.STRING },
            content: { type: Type.STRING, description: "Markdown formatted content for this section." },
          },
          required: ["heading", "content"],
        },
      },
      keyInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
      recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
      chartData: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["bar", "pie", "line"] },
            xAxisLabel: { type: Type.STRING },
            yAxisLabel: { type: Type.STRING },
            data: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                },
                required: ["name", "value"],
              },
            },
          },
          required: ["title", "type", "data"],
        },
      },
      citations: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["title", "executiveSummary", "sections", "keyInsights", "recommendations", "chartData", "citations"],
  };

  const prompt = `
    You are the Synthesizer agent. Based on the Analysis and Raw Data below, generate a comprehensive research report.
    
    Topic: ${config.topic}
    Depth: ${config.depth}
    
    --- ANALYSIS ---
    ${analysis}
    
    --- RAW DATA SUMMARY ---
    ${rawData.substring(0, 5000)} (truncated for efficiency)
    
    Output a JSON object matching the provided schema.
    Ensure the 'content' fields use Markdown for formatting (bold, italic, lists).
    Generate at least one meaningful dataset for 'chartData' that visualizes key statistics found in the research (e.g., market growth, comparison of factors, sentiment).
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: reportSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Synthesizer");
    
    return JSON.parse(text) as ResearchReport;
  } catch (error) {
    console.error("Synthesizer Error:", error);
    throw new Error("Synthesizer failed to generate report.");
  }
};
