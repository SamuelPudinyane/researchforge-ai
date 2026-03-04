# ResearchForge AI

**ResearchForge AI** is a multi-agent orchestration system built with React and **Ollama**. It utilizes specialized agents to conduct deep research, critically analyze findings, and synthesize comprehensive reports with data visualizations using local LLMs.

## 🤖 Agents

1.  **DataGatherer**: Builds a broad topic brief with facts, statistics, key developments, and likely references to verify.
2.  **Analyzer**: Uses model reasoning to cross-verify facts, detect bias, and identify gaps in the gathered data.
3.  **Synthesizer**: Compiles the analysis into a structured JSON report, generating Markdown content and chart data for visualization.

## ✨ Features

-   **Deep Research**: Configurable depth (Basic, Advanced, Expert).
-   **Local LLM Engine**: Runs through Ollama with configurable model and endpoint.
-   **Visualizations**: Auto-generated charts (Bar, Pie, Line) using Recharts based on research data.
-   **Terminal UI**: Real-time log of agent-to-agent communication and system status.
-   **Export**: Download reports as formatted Markdown files.

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18+)
-   [Ollama](https://ollama.com/) installed and running locally.
-   A pulled model (for example: `ollama pull llama3.1`).

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
    VITE_OLLAMA_BASE_URL=http://localhost:11434
    VITE_OLLAMA_MODEL=llama3.1
    VITE_OLLAMA_NUM_CTX=1024
    VITE_SCRAPE_PROXY_BASE_URL=https://r.jina.ai/http://
    ```

    `VITE_SCRAPE_PROXY_BASE_URL` enables internet retrieval for the DataGatherer agent (web search + scraping pipeline). If your network blocks this endpoint, set this to another reachable HTTP text-extraction proxy.
    `VITE_OLLAMA_NUM_CTX` controls prompt context size. Lower values (for example `512` or `256`) help on low-memory systems.

4.  Run the development server:
    ```bash
    npm start
    ```

## 🛠 Tech Stack

-   **Frontend**: React 19, Tailwind CSS
-   **AI**: Ollama HTTP API (`/api/chat`)
-   **Visualization**: Recharts
-   **Formatting**: React Markdown

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
