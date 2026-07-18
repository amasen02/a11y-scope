'use client';

import { useState } from 'react';

interface ViolationItemProps {
  axeId: string;
  impact: string;
  description: string;
  helpUrl: string;
  wcagCriteria: string;
  nodeSelector: string;
  nodeHtml: string;
  message: string;
}

const impactColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  serious: 'bg-orange-100 text-orange-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  minor: 'bg-blue-100 text-blue-800',
};

export default function ViolationItem({
  axeId,
  impact,
  description,
  helpUrl,
  wcagCriteria,
  nodeSelector,
  nodeHtml,
  message,
}: ViolationItemProps) {
  const [expanded, setExpanded] = useState(false);

  const badgeClass = impactColors[impact] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
            >
              {impact}
            </span>
            <span className="text-sm font-mono text-gray-700 font-medium">{axeId}</span>
            {wcagCriteria && (
              <span className="text-xs text-gray-400">{wcagCriteria}</span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <span className="ml-3 text-gray-400 flex-shrink-0 mt-0.5">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 bg-gray-50">
          <div className="pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Failure Summary
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{message}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              CSS Selector
            </p>
            <code className="block text-xs bg-white border border-gray-200 rounded px-2 py-1.5 font-mono text-gray-800 break-all">
              {nodeSelector}
            </code>
          </div>

          {nodeHtml && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                HTML Element
              </p>
              <pre className="text-xs bg-white border border-gray-200 rounded px-2 py-1.5 font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
                {nodeHtml}
              </pre>
            </div>
          )}

          <div>
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
            >
              View fix guidance →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
