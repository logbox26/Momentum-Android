import React from 'react';

interface FormattedMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`
 */
function renderInline(text: string): React.ReactNode[] {
  // Regex to match **bold**, *italic*, and `code`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(
        <strong key={match.index} className="font-bold text-[var(--text-primary)]">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // *italic*
      parts.push(
        <em key={match.index} className="italic">
          {match[3]}
        </em>
      );
    } else if (match[4]) {
      // `code`
      parts.push(
        <code
          key={match.index}
          className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[0.9em]"
        >
          {match[4]}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * FormattedMarkdown renders Gemini responses cleanly without raw asterisks
 */
export const FormattedMarkdown: React.FC<FormattedMarkdownProps> = ({
  content,
  className = '',
}) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`ul_${elements.length}`} className="my-1.5 space-y-1 pl-4 list-disc">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Header 3 or 2
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList();
      const headerText = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <h4
          key={`h_${i}`}
          className="font-bold text-[1.07em] text-[var(--text-primary)] mt-2 mb-1"
        >
          {renderInline(headerText)}
        </h4>
      );
      continue;
    }

    // Bullet point: "* " or "- "
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      inList = true;
      const bulletText = trimmed.replace(/^(\*|-|•)\s*/, '');
      listItems.push(
        <li key={`li_${i}`} className="leading-relaxed">
          {renderInline(bulletText)}
        </li>
      );
      continue;
    }

    // Numbered list: "1. "
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      flushList();
      elements.push(
        <div key={`num_${i}`} className="flex items-start gap-1.5 my-1">
          <span className="font-bold text-[var(--accent-primary)] shrink-0 tabular-nums">
            {numMatch[1]}.
          </span>
          <span className="leading-relaxed">{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Regular line / paragraph
    flushList();
    elements.push(
      <p key={`p_${i}`} className="my-1 leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};
