import type { FlattenedHit } from '../types/opensearch';
import { parseLuceneQuery, evaluateLuceneQuery, extractHighlightTerms } from './luceneSearch';

export function filterHits(hits: FlattenedHit[], searchTerm: string): FlattenedHit[] {
  if (!searchTerm.trim()) return hits;
  const query = parseLuceneQuery(searchTerm);
  return hits.filter(hit => evaluateLuceneQuery(query, hit as Record<string, unknown>));
}

/** Highlight all matching terms from a Lucene query in text */
export function highlightText(text: string, searchTerm: string): string {
  if (!searchTerm.trim() || !text) return escapeHtml(text);

  const query = parseLuceneQuery(searchTerm);
  const terms = extractHighlightTerms(query);

  if (terms.length === 0) return escapeHtml(text);

  // Build a single regex alternation of all terms (longest first to avoid partial overlaps)
  const escaped = terms
    .filter(t => t.length > 0)
    .sort((a, b) => b.length - a.length)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (escaped.length === 0) return escapeHtml(text);

  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

  return text.replace(regex, (match) => `<mark>${escapeHtml(match)}</mark>`);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
