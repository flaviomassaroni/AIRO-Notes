/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';

interface MathProps {
  math: string;
  block?: boolean;
}

declare global {
  interface Window {
    katex?: {
      render: (math: string, element: HTMLElement, options?: Record<string, any>) => void;
    };
  }
}

export const MathText: React.FC<MathProps> = ({ math, block = false }) => {
  const containerRef = useRef<HTMLSpanElement | HTMLDivElement>(null);
  const [isKatexLoaded, setIsKatexLoaded] = useState<boolean>(typeof window !== 'undefined' && !!window.katex);

  useEffect(() => {
    if (isKatexLoaded) {
      if (containerRef.current && window.katex) {
        try {
          window.katex.render(math, containerRef.current, {
            displayMode: block,
            throwOnError: false,
            trust: true,
          });
        } catch (err) {
          console.error("KaTeX failed to render:", err);
        }
      }
      return;
    }

    // Polling or waiting for MathJax/KaTeX
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.katex) {
        setIsKatexLoaded(true);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [math, block, isKatexLoaded]);

  useEffect(() => {
    // Force re-render if loaded changes
    if (isKatexLoaded && containerRef.current && window.katex) {
      try {
        window.katex.render(math, containerRef.current, {
          displayMode: block,
          throwOnError: false,
          trust: true,
        });
      } catch (err) {
        console.error("KaTeX render update failed:", err);
      }
    }
  }, [isKatexLoaded, math, block]);

  if (block) {
    return (
      <div 
        ref={containerRef as React.RefObject<HTMLDivElement>} 
        className="my-3 overflow-x-auto text-center font-serif text-lg text-slate-100 py-2 px-4 rounded bg-slate-900/50 border border-slate-800/80 select-all"
      >
        {!isKatexLoaded && <code className="text-sm font-mono text-cyan-400">{math}</code>}
      </div>
    );
  }

  return (
    <span 
      ref={containerRef as React.RefObject<HTMLSpanElement>} 
      className="inline-block px-1 font-mono align-middle select-all"
    >
      {!isKatexLoaded && <code className="text-xs font-mono text-cyan-400">{math}</code>}
    </span>
  );
};

export default MathText;
