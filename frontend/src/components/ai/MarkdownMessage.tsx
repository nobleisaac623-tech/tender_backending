import React from 'react';

interface Props {
  content: string;
  isUser?: boolean;
}

/**
 * Safely converts plain markdown-like text from AI responses into
 * React JSX elements. No external libraries needed.
 * Handles: **bold**, *italic*, - bullet lists, numbered lists,
 * ``` code blocks ```, `inline code`, and line breaks.
 */
export default function MarkdownMessage({ content, isUser = false }: Props) {
  if (!content) return null;

  const textColor = isUser ? 'white' : '#334155';

  // Split into lines for processing
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Code block (```) ───────────────────────────────────────
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} style={{
          background: isUser ? 'rgba(255,255,255,0.15)' : '#f8fafc',
          border: '1px solid ' + (isUser ? 'rgba(255,255,255,0.2)' : '#e2e8f0'),
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '12px',
          overflowX: 'auto',
          margin: '6px 0',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          color: isUser ? 'white' : '#1e293b',
        }}>
          {codeLines.join('\n')}
        </pre>
      );
      i++;
      continue;
    }

    // ── Unordered list (- or * or •) ──────────────────────────
    if (/^[\-\*•]\s/.test(line.trim())) {
      const listItems: string[] = [];
      while (i < lines.length && /^[\-\*•]\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[\-\*•]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={i} style={{ paddingLeft: '18px', margin: '4px 0' }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '3px', color: textColor, fontSize: '13px', lineHeight: '1.5' }}>
              {renderInline(item, isUser)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Ordered list (1. 2. etc) ───────────────────────────────
    if (/^\d+\.\s/.test(line.trim())) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={i} style={{ paddingLeft: '18px', margin: '4px 0' }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '3px', color: textColor, fontSize: '13px', lineHeight: '1.5' }}>
              {renderInline(item, isUser)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Heading (## or ###) ────────────────────────────────────
    if (line.startsWith('### ')) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: '13px', color: textColor, margin: '8px 0 4px' }}>
          {renderInline(line.replace(/^###\s/, ''), isUser)}
        </div>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: '14px', color: textColor, margin: '10px 0 4px' }}>
          {renderInline(line.replace(/^##\s/, ''), isUser)}
        </div>
      );
      i++;
      continue;
    }

    // ── Horizontal rule (---) ──────────────────────────────────
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(
        <hr key={i} style={{ border: 'none', borderTop: '1px solid ' + (isUser ? 'rgba(255,255,255,0.3)' : '#e2e8f0'), margin: '8px 0' }} />
      );
      i++;
      continue;
    }

    // ── Empty line → spacing ───────────────────────────────────
    if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: '6px' }} />);
      i++;
      continue;
    }

    // ── Regular paragraph line ─────────────────────────────────
    elements.push(
      <p key={i} style={{ margin: '2px 0', color: textColor, fontSize: '13px', lineHeight: '1.6' }}>
        {renderInline(line, isUser)}
      </p>
    );
    i++;
  }

  return <div>{elements}</div>;
}

/**
 * Renders inline markdown: **bold**, *italic*, `code`, plain text.
 * Returns an array of React nodes — never uses dangerouslySetInnerHTML.
 */
function renderInline(text: string, isUser: boolean): React.ReactNode[] {
  if (!text) return [];

  const parts: React.ReactNode[] = [];
  // Pattern matches: **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      parts.push(
        <span key={keyCounter++}>{text.slice(lastIndex, match.index)}</span>
      );
    }

    if (match[0].startsWith('**')) {
      // Bold
      parts.push(
        <strong key={keyCounter++} style={{ fontWeight: 700, color: isUser ? 'white' : '#1e293b' }}>
          {match[2]}
        </strong>
      );
    } else if (match[0].startsWith('*')) {
      // Italic
      parts.push(
        <em key={keyCounter++} style={{ fontStyle: 'italic' }}>
          {match[3]}
        </em>
      );
    } else if (match[0].startsWith('`')) {
      // Inline code
      parts.push(
        <code key={keyCounter++} style={{
          background: isUser ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
          borderRadius: '4px',
          padding: '1px 5px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: isUser ? 'white' : '#1e293b',
        }}>
          {match[4]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    parts.push(<span key={keyCounter++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key={0}>{text}</span>];
}
