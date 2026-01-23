# ResearchForge AI

**ResearchForge AI** is a multi-agent orchestration system built with React and the Google Gemini API (Gemini 3 Pro). It utilizes specialized agents to conduct deep research, critically analyze findings, and synthesize comprehensive reports with data visualizations.

## 🤖 Agents

1.  **DataGatherer**: Uses Google Search grounding to collect real-time data, academic sources, and statistics.
2.  **Analyzer**: Uses **Gemini 3 Pro Deep Think** mode (reasoning) to cross-verify facts, detect bias, and identify gaps in the gathered data.
3.  **Synthesizer**: Compiles the analysis into a structured JSON report, generating Markdown content and chart data for visualization.

## ✨ Features

-   **Deep Research**: Configurable depth (Basic, Advanced, Expert).
-   **Reasoning Engine**: Leverages `thinkingConfig` to ensure high-quality analysis.
-   **Visualizations**: Auto-generated charts (Bar, Pie, Line) using Recharts based on research data.
-   **Terminal UI**: Real-time log of agent-to-agent communication and system status.
-   **Export**: Download reports as formatted Markdown files.

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18+)
-   A Google AI Studio API Key with access to `gemini-3-pro-preview` and `google-search`.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/research-forge-ai.git
    cd research-forge-ai
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up your environment variables. Create a `.env` file in the root directory:
    ```
    API_KEY=your_google_ai_studio_api_key
    ```

4.  Run the development server:
    ```bash
    npm start
    ```

## 🛠 Tech Stack

-   **Frontend**: React 19, Tailwind CSS
-   **AI**: Google GenAI SDK (`@google/genai`)
-   **Visualization**: Recharts
-   **Formatting**: React Markdown

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
