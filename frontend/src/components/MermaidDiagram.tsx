import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { GitFork, Maximize2, Minimize2, Copy, Check, AlertCircle } from 'lucide-react';

interface MermaidDiagramProps {
  code: string;
  theme?: 'light' | 'dark';
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code, theme = 'light' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const idRef = useRef(`mermaid_${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    let isMounted = true;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        themeVariables: theme === 'dark' ? {
          primaryColor: '#1e293b',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#38bdf8',
          lineColor: '#60a5fa',
          secondaryColor: '#0f172a',
          tertiaryColor: '#1e1b4b'
        } : {
          primaryColor: '#eff6ff',
          primaryTextColor: '#0f172a',
          primaryBorderColor: '#3b82f6',
          lineColor: '#2563eb',
          secondaryColor: '#f8fafc',
          tertiaryColor: '#f1f5f9'
        }
      });

      // Clean and sanitize code
      const cleanCode = code.trim();
      const elementId = idRef.current;

      mermaid.render(elementId, cleanCode)
        .then(({ svg }) => {
          if (isMounted) {
            setSvgContent(svg);
            setError(null);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.warn('Mermaid rendering issue:', err);
            setError('Could not render exact diagram syntax. Showing structured fallback below.');
          }
        });
    } catch (err: any) {
      if (isMounted) {
        setError(err.message || 'Error initializing flowchart');
      }
    }

    return () => {
      isMounted = false;
    };
  }, [code, theme]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`my-4 rounded-2xl border transition-all overflow-hidden ${
      theme === 'dark'
        ? 'bg-slate-900/90 border-slate-700/80 shadow-lg shadow-black/40'
        : 'bg-white border-blue-100 shadow-md shadow-blue-500/5'
    } ${isExpanded ? 'fixed inset-4 z-50 overflow-auto bg-white dark:bg-slate-900 p-6' : ''}`}>
      {/* Diagram Header Banner */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b text-xs font-semibold ${
        theme === 'dark'
          ? 'bg-slate-800/80 border-slate-700/80 text-slate-200'
          : 'bg-slate-50 border-blue-50 text-slate-700'
      }`}>
        <div className="flex items-center space-x-2">
          <GitFork className="w-4 h-4 text-blue-500" />
          <span>Interactive Flowchart / Process Roadmap</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            title="Copy Diagram Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            title={isExpanded ? "Close Fullscreen" : "Expand Fullscreen"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Rendered SVG or Fallback */}
      <div className="p-4 sm:p-6 overflow-x-auto flex justify-center items-center min-h-[160px]">
        {error ? (
          <div className="w-full space-y-3">
            <div className="flex items-center space-x-2 text-amber-500 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {/* Visual Text Flow Fallback */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 font-mono text-xs whitespace-pre-wrap text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {code}
            </div>
          </div>
        ) : svgContent ? (
          <div
            ref={containerRef}
            className="mermaid-svg-container w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto transition-transform duration-200"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Rendering visual flowchart...</span>
          </div>
        )}
      </div>
    </div>
  );
};
