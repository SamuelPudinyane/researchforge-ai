import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AgentType, LogEntry, ResearchConfig, ResearchReport, ResearchStatus } from './types';
import * as AgentService from './services/geminiService';
import AgentTerminal from './components/AgentTerminal';
import ReportDisplay from './components/ReportDisplay';

const App: React.FC = () => {
  const [config, setConfig] = useState<ResearchConfig>({
    topic: '',
    depth: 'Advanced',
    constraints: '',
  });

  const [status, setStatus] = useState<ResearchStatus>(ResearchStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [report, setReport] = useState<ResearchReport | null>(null);

  const addLog = useCallback((agent: AgentType, message: string, details?: string) => {
    setLogs(prev => [...prev, {
      id: uuidv4(),
      timestamp: new Date(),
      agent,
      message,
      details
    }]);
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.topic) return;

    // Reset State
    setLogs([]);
    setReport(null);
    setStatus(ResearchStatus.GATHERING);
    addLog(AgentType.SYSTEM, "ResearchForge AI Initialized.");
    addLog(AgentType.SYSTEM, `Mission: ${config.topic} [Depth: ${config.depth}]`);

    try {
      // 1. DataGatherer
      const gathererLog = (msg: string) => addLog(AgentType.GATHERER, msg);
      const rawData = await AgentService.runDataGatherer(config, gathererLog);
      addLog(AgentType.GATHERER, "Data collection complete. Handing off to Analyzer.", rawData);

      // 2. Analyzer
      setStatus(ResearchStatus.ANALYZING);
      const analyzerLog = (msg: string) => addLog(AgentType.ANALYZER, msg);
      const analysis = await AgentService.runAnalyzer(rawData, config, analyzerLog);
      addLog(AgentType.ANALYZER, "Critical evaluation complete. Gaps identified and bias checked.", analysis);

      // 3. Synthesizer
      setStatus(ResearchStatus.SYNTHESIZING);
      const synthesizerLog = (msg: string) => addLog(AgentType.SYNTHESIZER, msg);
      const finalReport = await AgentService.runSynthesizer(analysis, rawData, config, synthesizerLog);
      
      setReport(finalReport);
      addLog(AgentType.SYNTHESIZER, "Report generation complete. Visualizations rendered.");
      setStatus(ResearchStatus.COMPLETE);

    } catch (error: any) {
      console.error(error);
      addLog(AgentType.SYSTEM, `CRITICAL FAILURE: ${error.message}`);
      setStatus(ResearchStatus.ERROR);
    }
  };

  const handleExport = () => {
    if (!report) return;
    const markdownContent = `# ${report.title}\n\n## Executive Summary\n${report.executiveSummary}\n\n${report.sections.map(s => `## ${s.heading}\n${s.content}`).join('\n\n')}\n\n## Insights\n${report.keyInsights.map(i => `- ${i}`).join('\n')}\n\n## References\n${report.citations.map(c => `- ${c}`).join('\n')}`;
    
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ResearchForge_${config.topic.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* Sidebar - Control Panel */}
      <div className="w-full md:w-80 bg-gray-800 border-r border-gray-700 flex flex-col p-6 z-10 shadow-xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            ResearchForge
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Multi-Agent Orchestrator</p>
        </div>

        <form onSubmit={handleStart} className="space-y-6 flex-1">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Research Topic</label>
            <input
              type="text"
              required
              disabled={status !== ResearchStatus.IDLE && status !== ResearchStatus.COMPLETE && status !== ResearchStatus.ERROR}
              value={config.topic}
              onChange={(e) => setConfig({ ...config, topic: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all disabled:opacity-50"
              placeholder="e.g. Quantum Cryptography"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Depth Level</label>
            <div className="grid grid-cols-3 gap-2">
              {['Basic', 'Advanced', 'Expert'].map((level) => (
                <button
                  key={level}
                  type="button"
                  disabled={status !== ResearchStatus.IDLE && status !== ResearchStatus.COMPLETE && status !== ResearchStatus.ERROR}
                  onClick={() => setConfig({ ...config, depth: level as any })}
                  className={`text-xs py-2 rounded-md border transition-all ${
                    config.depth === level
                      ? 'bg-cyan-900/50 border-cyan-500 text-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Constraints & Context</label>
            <textarea
              disabled={status !== ResearchStatus.IDLE && status !== ResearchStatus.COMPLETE && status !== ResearchStatus.ERROR}
              value={config.constraints}
              onChange={(e) => setConfig({ ...config, constraints: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all h-24 resize-none disabled:opacity-50"
              placeholder="e.g. Focus on publications from 2024-2025. Ignore marketing blogs."
            />
          </div>

          <button
            type="submit"
            disabled={status !== ResearchStatus.IDLE && status !== ResearchStatus.COMPLETE && status !== ResearchStatus.ERROR}
            className={`w-full py-4 rounded-lg font-bold text-sm uppercase tracking-wide transition-all transform flex items-center justify-center gap-2 ${
               status === ResearchStatus.IDLE || status === ResearchStatus.COMPLETE || status === ResearchStatus.ERROR
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
             {status === ResearchStatus.IDLE || status === ResearchStatus.COMPLETE || status === ResearchStatus.ERROR ? (
                 <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Initialize Agents
                 </>
             ) : (
                 <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                 </>
             )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-700">
           <div className="flex items-center justify-between text-xs text-gray-500">
             <span>Status:</span>
             <span className={`font-mono font-bold ${
               status === ResearchStatus.ERROR ? 'text-red-500' :
               status === ResearchStatus.COMPLETE ? 'text-green-500' :
               status === ResearchStatus.IDLE ? 'text-gray-400' : 'text-cyan-400 animate-pulse'
             }`}>
               {status}
             </span>
           </div>
           <div className="mt-2 text-[10px] text-gray-600">
             Gemini 3 Pro + Search + Reasoning
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Background Grid Decoration */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-5" style={{ 
            backgroundImage: 'linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px)',
            backgroundSize: '20px 20px'
        }}></div>

        <div className="flex-1 p-4 md:p-8 flex flex-col gap-6 z-10 overflow-hidden">
            {/* Top Section: Logs */}
            <div className={`transition-all duration-500 ease-in-out ${report ? 'h-1/3' : 'h-full'}`}>
                <AgentTerminal logs={logs} />
            </div>

            {/* Bottom Section: Report (Only visible when report exists) */}
            {report && (
                <div className="flex-1 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-6 overflow-hidden animate-fade-in-up flex flex-col">
                   <ReportDisplay report={report} onExport={handleExport} />
                </div>
            )}
        </div>
      </div>

    </div>
  );
};

export default App;