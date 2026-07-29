import type { ContentBlock } from "../lib/content-hub";

const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
export function ContentDocument({ blocks }: { blocks: ContentBlock[] }) {
  return <div className="article-blocks">{blocks.map((block) => {
    if (block.type === "title") return null;
    if (["answer", "summary", "paragraph", "subheading"].includes(block.type) && typeof block.text === "string") {
      if (block.type === "answer") return <aside className="answer-card" key={block.id}><span>핵심 답변</span><p>{block.text}</p></aside>;
      if (block.type === "summary") return <section className="summary-card" key={block.id}><h2>한눈에 보기</h2><p>{block.text}</p></section>;
      if (block.type === "subheading") return <h2 key={block.id}>{block.text}</h2>;
      return <p key={block.id}>{block.text}</p>;
    }
    if (block.type === "section" && typeof block.heading === "string" && typeof block.body === "string") return <section key={block.id}><h2>{block.heading}</h2><p>{block.body}</p></section>;
    if ((block.type === "bulletList" || block.type === "numberedList")) { const Tag = block.type === "bulletList" ? "ul" : "ol"; return <Tag key={block.id}>{strings(block.items).map((item) => <li key={item}>{item}</li>)}</Tag>; }
    if (block.type === "checklist" && Array.isArray(block.items)) return <ul className="checklist" key={block.id}>{block.items.map((item, index) => { const value = item as { text?: string }; return <li key={`${value.text}-${index}`}><span aria-hidden="true">✓</span>{value.text}</li>; })}</ul>;
    if (block.type === "table" && Array.isArray(block.headers) && Array.isArray(block.rows)) return <div className="table-scroll" key={block.id}><table><thead><tr>{strings(block.headers).map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{block.rows.map((row, index) => <tr key={index}>{strings(row).map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
    if (block.type === "faq" && Array.isArray(block.items)) return <section className="faq-list" key={block.id}><h2>자주 묻는 질문</h2>{block.items.map((item, index) => { const value = item as { question?: string; answer?: string }; return <details key={`${value.question}-${index}`}><summary>{value.question}</summary><p>{value.answer}</p></details>; })}</section>;
    if (block.type === "cta" && typeof block.url === "string" && typeof block.label === "string") return <aside className="cta-card" key={block.id}><p>{typeof block.text === "string" ? block.text : ""}</p><a href={block.url}>{block.label}</a></aside>;
    if (block.type === "sources" && Array.isArray(block.items)) return <section className="source-list" key={block.id}><h2>공식 근거 및 출처</h2><ol>{block.items.map((item, index) => { const value = item as { label?: string; url?: string }; return <li key={`${value.url}-${index}`}><a href={value.url} rel="noreferrer">{value.label}</a></li>; })}</ol></section>;
    return null;
  })}</div>;
}
