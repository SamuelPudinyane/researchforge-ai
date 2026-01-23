import React, { useEffect, useRef } from 'react';
import { LogEntry, AgentType } from '../types';

interface AgentTerminalProps {
  logs: LogEntry[];
}

const AgentTerminal: React.FC<AgentTerminalProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getAgentColor = (agent: AgentType) => {
    switch (agent) {
      case AgentType.GATHERER: return 'text-blue-400';
      case AgentType.ANALYZER: return 'text-purple-400';
      case AgentType.SYNTHESIZER: return 'text-green-400';
      case AgentType.SYSTEM: return 'text-gray-400';
      default: return 'text-white';
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 h-full flex flex-col font-mono text-sm shadow-inner shadow-black/50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-700 pb-2 mb-2">
        <span className="text-gray-400 uppercase tracking-widest text-xs font-bold">/// Agent Communication Log</span>
        <div className="flex space-x-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {logs.length === 0 && (
          <div className="text-gray-600 italic text-center mt-10">Waiting for mission initialization...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="animate-fade-in-up">
            <div className="flex items-baseline space-x-2">
              <span className="text-gray-600 text-xs">[{log.timestamp.toLocaleTimeString()}]</span>
              <span className={`font-bold ${getAgentColor(log.agent)}`}>
                &lt;{log.agent}&gt;
              </span>
            </div>
            <div className="ml-24 pl-2 border-l-2 border-gray-800 text-gray-300 whitespace-pre-wrap">
              {log.message}
            </div>
            {log.details && (
                <div className="ml-24 mt-1 p-2 bg-gray-800/50 rounded text-xs text-gray-400 font-mono overflow-x-auto">
                    {log.details.substring(0, 300)}...
                </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default AgentTerminal;