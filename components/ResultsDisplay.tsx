
import React, { useState, useEffect } from 'react';
import type { AnalysisResult, AnalysisStep } from '../types';
import { CheckCircleIcon, ShieldCheckIcon, XCircleIcon, ArrowPathIcon, InformationCircleIcon, ClipboardDocumentIcon } from './icons';

interface ResultsDisplayProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  steps: AnalysisStep[];
  onReset: () => void;
}

const getVerdictStyles = (verdict: AnalysisResult['verdict'] | undefined) => {
  switch (verdict) {
    case 'Likely AI-Generated':
      return {
        bgColor: 'bg-red-500/10',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/30',
        icon: <XCircleIcon className="w-8 h-8 text-red-400" />,
      };
    case 'Likely Real':
      return {
        bgColor: 'bg-green-500/10',
        textColor: 'text-green-400',
        borderColor: 'border-green-500/30',
        icon: <ShieldCheckIcon className="w-8 h-8 text-green-400" />,
      };
    case 'Inconclusive':
    default:
      return {
        bgColor: 'bg-yellow-500/10',
        textColor: 'text-yellow-400',
        borderColor: 'border-yellow-500/30',
        icon: <InformationCircleIcon className="w-8 h-8 text-yellow-400" />,
      };
  }
};

const LoadingState: React.FC<{ steps: AnalysisStep[] }> = ({ steps }) => (
  <div className="p-8 text-center">
    <div className="animate-spin text-cyan-400 mx-auto mb-4">
      <ArrowPathIcon className="w-12 h-12" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-4">Analysis in Progress...</h3>
    <ul className="space-y-2 text-left">
      {steps.map((step, index) => (
        <li key={index} className="flex items-center gap-3 text-gray-300">
          {step.status === 'completed' ? <CheckCircleIcon className="w-5 h-5 text-green-400" /> : <ArrowPathIcon className={`w-5 h-5 ${step.status === 'pending' ? 'animate-spin' : ''}`} />}
          <span>{step.message}</span>
        </li>
      ))}
    </ul>
  </div>
);

const ResultDetails: React.FC<{ result: AnalysisResult }> = ({ result }) => {
  const { bgColor, textColor, borderColor, icon } = getVerdictStyles(result?.verdict);
  const [copyButtonText, setCopyButtonText] = useState('Copy Report');

  const handleCopy = () => {
    const reportToCopy = `
      ${result.full_report}

      ---
      Methodology Note: ${result.methodology_note}
    `;
    if (result.full_report) {
      navigator.clipboard.writeText(reportToCopy.trim());
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy Report'), 2000);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className={`p-4 rounded-lg flex items-center gap-4 ${bgColor} border ${borderColor}`}>
        {icon}
        <div>
          <h2 className={`text-2xl font-bold ${textColor}`}>{result.verdict}</h2>
          <p className={`text-sm ${textColor.replace('400', '500')}`}>Prediction Confidence: {Math.round(result.confidence * 100)}%</p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-lg text-gray-300 italic">"{result.summary}"</p>
        
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 prose prose-invert prose-p:text-gray-300 prose-headings:text-cyan-300">
             <div
                className="whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: result.full_report
                    .replace(/### (.*)/g, '<h3 class="text-cyan-300 font-semibold mt-4 mb-2">$1</h3>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                }}
            />
        </div>
        
        {result.methodology_note && (
          <div className="bg-gray-800/70 rounded-lg p-4 border border-gray-700 flex items-start gap-3">
              <InformationCircleIcon className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
              <div>
                  <h3 className="font-semibold text-md text-cyan-300">A Note on Our Methodology</h3>
                  <p className="text-sm text-gray-400 mt-1">{result.methodology_note}</p>
              </div>
          </div>
        )}

        {result.web_sources && result.web_sources.length > 0 && (
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <h3 className="font-semibold text-lg text-cyan-300">Sources Found</h3>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {result.web_sources.map((source, index) => (
                <li key={index} className="text-gray-300"><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{source.title || source.uri}</a></li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={handleCopy}
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-all"
        >
          <ClipboardDocumentIcon className="w-5 h-5" />
          {copyButtonText}
        </button>
      </div>
    </div>
  );
};

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, isLoading, error, steps, onReset }) => {
  return (
    <div>
      {isLoading && <LoadingState steps={steps} />}
      {error && (
        <div className="p-8 text-center text-red-400">
          <XCircleIcon className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Analysis Failed</h3>
          <p>{error}</p>
        </div>
      )}
      {result && !isLoading && <ResultDetails result={result} />}

      {(result || error) && (
        <div className="p-6 border-t border-cyan-400/20 text-center">
            <button
              onClick={onReset}
              className="py-2 px-6 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-colors"
            >
            Analyze Another
          </button>
        </div>
      )}
    </div>
  );
};