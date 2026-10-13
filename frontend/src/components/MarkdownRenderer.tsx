import React from 'react';
import { MermaidDiagram } from './MermaidDiagram';
import { ExternalLink, Building2, Briefcase, GraduationCap, Trophy, Users, ArrowUpRight } from 'lucide-react';
import { ThemeMode } from '../types';

interface MarkdownRendererProps {
  content: string;
  theme?: ThemeMode;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, theme = 'light' }) => {
  if (!content) return null;

  // Split content by code blocks (especially ```mermaid ... ```)
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      parts.push(
        <div key={`text-${lastIndex}`} className="space-y-3">
          {renderTextContent(textBefore, theme)}
        </div>
      );
    }

    const language = match[1]?.toLowerCase().trim();
    const code = match[2];

    if (language === 'mermaid') {
      parts.push(
        <MermaidDiagram
          key={`mermaid-${match.index}`}
          code={code}
          theme={theme}
        />
      );
    } else {
      parts.push(
        <div
          key={`code-${match.index}`}
          className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 font-mono text-xs p-3.5"
        >
          {language && (
            <div className="text-[10px] text-slate-400 mb-1.5 uppercase font-bold tracking-wider">
              {language}
            </div>
          )}
          <pre className="overflow-x-auto whitespace-pre-wrap">{code}</pre>
        </div>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText.trim()) {
    parts.push(
      <div key={`text-${lastIndex}`} className="space-y-3">
        {renderTextContent(remainingText, theme)}
      </div>
    );
  }

  return <div className="space-y-3 leading-relaxed">{parts}</div>;
};

/**
 * Parses normal markdown text chunks (paragraphs, headings, lists, tables, links, images, blockquotes)
 */
function renderTextContent(text: string, theme: ThemeMode): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Markdown Table detection: lines containing "|"
    if (line.trim().startsWith('|') && line.includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      nodes.push(renderMarkdownTable(tableLines, `table-${i}`, theme));
      continue;
    }

    // Markdown Headings
    if (line.startsWith('### ')) {
      nodes.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-slate-900 dark:text-white pt-2 flex items-center space-x-1.5">
          <span>{parseInlineFormatting(line.replace('### ', ''))}</span>
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <h3 key={`h2-${i}`} className="text-base font-extrabold text-slate-900 dark:text-white pt-3 pb-1 border-b border-slate-100 dark:border-slate-800">
          {parseInlineFormatting(line.replace('## ', ''))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      nodes.push(
        <h2 key={`h1-${i}`} className="text-lg font-black text-slate-900 dark:text-white pt-4 pb-1">
          {parseInlineFormatting(line.replace('# ', ''))}
        </h2>
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      nodes.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-blue-500 pl-3 py-1 my-2 italic text-slate-700 dark:text-slate-300 bg-blue-500/5 rounded-r-lg text-xs"
        >
          {parseInlineFormatting(line.replace('> ', ''))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Unordered List (- or *)
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().substring(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="space-y-1.5 my-2 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-800 dark:text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-white shrink-0 mt-2" />
              <span className="flex-1">{parseInlineFormatting(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered List (1. 2. 3.)
    if (/^\d+\.\s/.test(line.trim())) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="space-y-1.5 my-2 pl-1 list-none">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-800 dark:text-white">
              <span className="w-5 h-5 rounded-md bg-blue-500/10 dark:bg-zinc-800 text-blue-600 dark:text-zinc-200 border border-blue-500/20 dark:border-zinc-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="flex-1">{parseInlineFormatting(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // College / Placement Highlight Card detection
    // e.g. lines with [Campus / College Image] or special highlight patterns
    if (line.includes('https://www.niatindia.com/campus/') && line.includes('[')) {
      nodes.push(
        <div key={`campus-callout-${i}`} className="my-3 p-3.5 rounded-xl border border-blue-200 dark:border-zinc-800 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 dark:from-zinc-900/50 dark:to-zinc-900/30 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Official Collaborating Campus Portal
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Verified B.Tech Degree & NIAT Industry-Ready Learning Center
              </p>
            </div>
          </div>
          <div className="shrink-0">{parseInlineFormatting(line)}</div>
        </div>
      );
      i++;
      continue;
    }

    // Normal paragraph
    nodes.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm text-slate-800 dark:text-white leading-relaxed">
        {parseInlineFormatting(line)}
      </p>
    );
    i++;
  }

  return nodes;
}

/**
 * Parses markdown tables
 */
function renderMarkdownTable(rows: string[], key: string, theme: ThemeMode): React.ReactNode {
  if (rows.length < 2) return null;

  // First line is header, second line is delimiter (|---|---|), subsequent lines are data
  const parseRow = (r: string) =>
    r
      .split('|')
      .slice(1, -1)
      .map(cell => cell.trim());

  const headers = parseRow(rows[0]);
  const dataRows = rows.slice(2).map(parseRow);

  return (
    <div key={key} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800/60 shadow-sm">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        <thead className={theme === 'dark' ? 'bg-transparent text-white' : 'bg-slate-100 text-slate-800'}>
          <tr>
            {headers.map((h, idx) => (
              <th key={idx} className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                {parseInlineFormatting(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-zinc-900/60">
          {dataRows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={`hover:bg-blue-50/40 dark:hover:bg-zinc-900/30 transition-colors ${
                rowIdx % 2 === 1 ? (theme === 'dark' ? 'bg-transparent' : 'bg-slate-50/50') : ''
              }`}
            >
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="py-2.5 px-3 text-slate-700 dark:text-white">
                  {parseInlineFormatting(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Parses inline formatting: bold (**text**), italics (*text*), inline code (`code`), links ([text](url)), and images (![alt](url))
 */
function parseInlineFormatting(text: string): React.ReactNode {
  // Regex to match images: ![alt](url)
  // Regex to match links: [text](url)
  // Regex to match bold: **text**
  // Regex to match code: `code`
  // Regex to match strike: ~~text~~

  // Simple token parser
  const elements: React.ReactNode[] = [];
  const tokenRegex = /(!?\[([^\]]*)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    if (match[1]) {
      // Image or Link
      const isImage = match[1].startsWith('!');
      const label = match[2];
      const url = match[3];

      if (isImage) {
        elements.push(
          <div key={`img-${match.index}`} className="my-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm max-w-md">
            <img
              src={url}
              alt={label || 'Campus image'}
              className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {label && (
              <p className="p-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 font-medium">
                {label}
              </p>
            )}
          </div>
        );
      } else {
        // Clickable Link
        elements.push(
          <a
            key={`link-${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-0.5 text-blue-600 dark:text-cyan-400 hover:text-blue-800 dark:hover:text-cyan-300 font-semibold underline underline-offset-2 transition-colors mx-0.5"
          >
            <span>{label}</span>
            <ArrowUpRight className="w-3 h-3 inline shrink-0" />
          </a>
        );
      }
    } else if (match[4]) {
      // Bold **text**
      elements.push(
        <strong key={`b-${match.index}`} className="font-bold text-slate-900 dark:text-white">
          {match[5]}
        </strong>
      );
    } else if (match[6]) {
      // Inline code `code`
      elements.push(
        <code
          key={`code-${match.index}`}
          className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-cyan-400 font-mono text-[11px] border border-slate-200 dark:border-slate-700 mx-0.5"
        >
          {match[7]}
        </code>
      );
    } else if (match[8]) {
      // Italic *text*
      elements.push(
        <em key={`em-${match.index}`} className="italic">
          {match[9]}
        </em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length > 0 ? elements : text;
}
