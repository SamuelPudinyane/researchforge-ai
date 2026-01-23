import React from 'react';
import { ResearchReport } from '../types';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface ReportDisplayProps {
  report: ResearchReport | null;
  onExport: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ReportDisplay: React.FC<ReportDisplayProps> = ({ report, onExport }) => {
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/20">
        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>Report will be generated here upon completion.</p>
      </div>
    );
  }

  const renderChart = (chart: ResearchReport['chartData'][0], index: number) => {
    return (
      <div key={index} className="my-8 p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <h4 className="text-lg font-semibold text-cyan-400 mb-4 text-center">{chart.title}</h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chart.type === 'bar' ? (
              <BarChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" label={{ value: chart.yAxisLabel, angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: '#fff' }} />
                <Legend />
                <Bar dataKey="value" fill="#22d3ee" name={chart.yAxisLabel || 'Value'} />
              </BarChart>
            ) : chart.type === 'pie' ? (
              <PieChart>
                 <Pie
                  data={chart.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chart.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: '#fff' }} />
              </PieChart>
            ) : (
                <LineChart data={chart.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: '#fff' }} />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#22d3ee" />
                </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">Figure {index + 1}: Generated based on analyzed data.</p>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-10">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <div className="flex justify-between items-start">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            {report.title}
            </h1>
            <button 
                onClick={onExport}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-2"
            >
                <span>Download Markdown</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
        </div>
        <div className="mt-4 bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r">
          <h3 className="text-blue-400 font-bold uppercase text-xs tracking-wider mb-2">Executive Summary</h3>
          <p className="text-gray-300 leading-relaxed">{report.executiveSummary}</p>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800/40 p-5 rounded-lg border border-gray-700/50">
          <h3 className="text-green-400 font-bold mb-3 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Key Insights
          </h3>
          <ul className="space-y-2">
            {report.keyInsights.map((insight, idx) => (
              <li key={idx} className="flex items-start text-sm text-gray-300">
                <span className="mr-2 text-green-500/50">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-gray-800/40 p-5 rounded-lg border border-gray-700/50">
          <h3 className="text-purple-400 font-bold mb-3 flex items-center">
             <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
            Strategic Recommendations
          </h3>
          <ul className="space-y-2">
            {report.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start text-sm text-gray-300">
                 <span className="mr-2 text-purple-500/50">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Charts */}
      {report.chartData && report.chartData.length > 0 && (
        <div>
          {report.chartData.map((chart, index) => renderChart(chart, index))}
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-8">
        {report.sections.map((section, idx) => (
          <div key={idx} className="prose prose-invert prose-cyan max-w-none">
            <h2 className="text-2xl font-semibold text-gray-200 border-b border-gray-800 pb-2 mb-4">{section.heading}</h2>
            <ReactMarkdown
                components={{
                    p: ({node, ...props}) => <p className="text-gray-400 mb-4 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 text-gray-400" {...props} />,
                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                    strong: ({node, ...props}) => <strong className="text-gray-200 font-bold" {...props} />,
                }}
            >
                {section.content}
            </ReactMarkdown>
          </div>
        ))}
      </div>

      {/* Citations */}
      {report.citations && report.citations.length > 0 && (
        <div className="mt-12 pt-6 border-t border-gray-700">
          <h3 className="text-gray-500 font-bold text-sm uppercase mb-3">Sources & References</h3>
          <ul className="grid grid-cols-1 gap-2">
            {report.citations.map((cite, idx) => (
              <li key={idx} className="text-xs text-gray-600 break-all font-mono hover:text-gray-400 transition-colors">
                 [{idx + 1}] {cite}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ReportDisplay;
