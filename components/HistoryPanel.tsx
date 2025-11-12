
import React from 'react';
import type { HistoryItem } from '../types';
import { ClockIcon, TrashIcon, XCircleIcon, ShieldCheckIcon, InformationCircleIcon } from './icons';

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelect: (id: string) => void;
  onClear: () => void;
}

const getVerdictIcon = (verdict: HistoryItem['verdict']) => {
    switch (verdict) {
        case 'Likely AI-Generated': return <XCircleIcon className="w-5 h-5 text-red-400" />;
        case 'Likely Real': return <ShieldCheckIcon className="w-5 h-5 text-green-400" />;
        case 'Inconclusive': return <InformationCircleIcon className="w-5 h-5 text-yellow-400" />;
        default: return <InformationCircleIcon className="w-5 h-5 text-gray-400" />;
    }
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onSelect, onClear }) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-cyan-400/20 rounded-2xl shadow-lg shadow-cyan-500/5 h-full flex flex-col">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ClockIcon className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-white">History</h2>
        </div>
        {history.length > 0 && (
            <button 
                onClick={onClear} 
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                aria-label="Clear history"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        )}
      </div>
      <div className="flex-grow overflow-y-auto p-2">
        {history.length === 0 ? (
          <p className="text-center text-gray-500 p-6">No analyses yet. Your past results will appear here.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onSelect(item.id)}
                  className="w-full text-left p-3 bg-gray-900/50 hover:bg-cyan-400/10 rounded-lg border border-gray-700 hover:border-cyan-400/50 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {getVerdictIcon(item.verdict)}
                      <p className="truncate text-sm font-medium text-gray-300 group-hover:text-white">
                        {item.description}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
