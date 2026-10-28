import { Fragment, type ReactNode } from 'react';

/**
 * Small, dependency-free Markdown renderer that never injects raw HTML.
 * Supports: headings, paragraphs, bullet/numbered lists, blockquotes, fenced
 * code, pipe tables, horizontal rules, bold, italic, inline code.
 */
export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  return <div className={`prose-sandbox ${className}`}>{renderBlocks(text)}</div>;
}

function renderInline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<strong key={i++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={i++}>{tok.slice(1, -1)}</code>);
    else out.push(<em key={i++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

function renderBlocks(text: string): ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const isSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      nodes.push(<pre key={key++}><code>{buf.join('\n')}</code></pre>);
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = Math.min(h[1].length, 3);
      const Tag = (`h${level}`) as 'h1' | 'h2' | 'h3';
      nodes.push(<Tag key={key++}>{renderInline(h[2])}</Tag>);
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { nodes.push(<hr key={key++} />); i++; continue; }

    if (isTableRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const header = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      nodes.push(
        <div key={key++} className="overflow-x-auto">
          <table>
            <thead><tr>{header.map((c, n) => <th key={n}>{renderInline(c)}</th>)}</tr></thead>
            <tbody>{rows.map((r, rn) => <tr key={rn}>{header.map((_, cn) => <td key={cn}>{renderInline(r[cn] ?? '')}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      nodes.push(<blockquote key={key++}>{renderInline(buf.join(' '))}</blockquote>);
      continue;
    }
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*•]\s+/, ''));
      nodes.push(<ul key={key++}>{items.map((it, n) => <li key={n}>{renderInline(it)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      nodes.push(<ol key={key++}>{items.map((it, n) => <li key={n}>{renderInline(it)}</li>)}</ol>);
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*[-*•]\s|\s*\d+[.)]\s|\s*>|\s*\|)/.test(lines[i])) buf.push(lines[i++]);
    if (!buf.length) { buf.push(line); i++; }
    nodes.push(<p key={key++}>{buf.map((b, n) => <Fragment key={n}>{n > 0 && <br />}{renderInline(b)}</Fragment>)}</p>);
  }
  return nodes;
}
