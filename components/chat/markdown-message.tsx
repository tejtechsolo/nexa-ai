'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose prose-invert max-w-none prose-p:my-2 prose-pre:my-3 prose-code:text-cyan-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const value = String(children).replace(/\n$/, '');
            return match ? (
              <CodeBlock language={match[1]} value={value} />
            ) : (
              <code className="rounded bg-black/30 px-1.5 py-0.5 text-sm" {...props}>{children}</code>
            );
          },
          a({ children, href }) {
            return <a href={href} target="_blank" rel="noreferrer noopener" className="text-cyan-300 underline underline-offset-4">{children}</a>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-400">
        <span>{language}</span>
        <button type="button" onClick={() => void copy()} className="rounded px-2 py-1 hover:bg-white/10">{copied ? 'Copied' : 'Copy code'}</button>
      </div>
      <SyntaxHighlighter language={language} style={oneDark} customStyle={{ margin: 0, background: 'transparent', padding: '1rem' }}>
        {value}
      </SyntaxHighlighter>
    </div>
  );
}
