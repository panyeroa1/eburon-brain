
import React, { useState, useCallback, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import { HistoryPanel } from './components/HistoryPanel';
import { orchestrateAnalysis } from './services/geminiService';
import type { AnalysisResult, AnalysisStep, HistoryItem } from './types';
import { SparklesIcon } from './components/icons';

const App: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentView, setCurrentView] = useState<'input' | 'analysis'>('input');

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('eburonHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      localStorage.removeItem('eburonHistory');
    }
  }, []);

  const handleAnalysis = useCallback(async (url: string, description: string, imageFile: File | null, transcript: string) => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setAnalysisSteps([]);
    setCurrentView('analysis');

    try {
      const results = await orchestrateAnalysis(url, description, imageFile, transcript, (step) => {
        setAnalysisSteps(prev => [...prev, step]);
      });
      setAnalysisResult(results);

      const newHistoryItem: HistoryItem = {
        ...results,
        id: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        description: description,
      };
      
      setHistory(prev => {
        const updatedHistory = [newHistoryItem, ...prev];
        localStorage.setItem('eburonHistory', JSON.stringify(updatedHistory));
        return updatedHistory;
      });

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = () => {
    setAnalysisResult(null);
    setIsLoading(false);
    setError(null);
    setAnalysisSteps([]);
    setCurrentView('input');
  };

  const handleSelectHistory = (id: string) => {
    const selectedItem = history.find(item => item.id === id);
    if (selectedItem) {
      setAnalysisResult(selectedItem);
      setError(null);
      setIsLoading(false);
      setAnalysisSteps([]);
      setCurrentView('analysis');
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('eburonHistory');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-7xl text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-2">
          <SparklesIcon className="w-10 h-10 text-cyan-400" />
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Eburon Content Brain
          </h1>
        </div>
        <p className="text-lg text-gray-400">
          Analyze video content for authenticity. Get a detailed Proof-of-Concept report.
        </p>
      </header>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        <main className="lg:col-span-2">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-cyan-400/20 rounded-2xl shadow-2xl shadow-cyan-500/10 transition-all duration-300">
            {currentView === 'input' && (
              <InputForm onAnalyze={handleAnalysis} disabled={isLoading} />
            )}
            {currentView === 'analysis' && (
              <ResultsDisplay
                result={analysisResult}
                isLoading={isLoading}
                error={error}
                steps={analysisSteps}
                onReset={handleReset}
              />
            )}
          </div>
        </main>
        <aside className="lg:col-span-1">
          <HistoryPanel
            history={history}
            onSelect={handleSelectHistory}
            onClear={handleClearHistory}
          />
        </aside>
      </div>
      <footer className="text-center mt-8 text-gray-500 text-sm">
        <p>Powered by Google Gemini. Analysis may not be 100% accurate.</p>
      </footer>
    </div>
  );
};

export default App;