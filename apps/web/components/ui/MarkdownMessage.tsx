'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'isomorphic-dompurify';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

const ALLOWED_TAGS = ['p', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'a', 'br', 'code', 'pre', 'blockquote'];
const ALLOWED_ATTR = ['href', 'rel', 'target'];

function sanitizeMarkdown(content: string): string {
  const cleaned = DOMPurify.sanitize(content, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
  return cleaned.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
}

export function MarkdownMessage({ content, className = '' }: MarkdownMessageProps) {
  const safe = sanitizeMarkdown(content);
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href?.startsWith('javascript:') ? '#' : href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {children}
            </a>
          ),
        }}
      >
        {safe}
      </ReactMarkdown>
    </div>
  );
}
