// Lucene query parser and evaluator
// Supports: field:value, "phrases", AND/OR/NOT/-, wildcards (*), grouping ()

type Token =
  | { type: 'TERM'; value: string }
  | { type: 'PHRASE'; value: string }
  | { type: 'AND' }
  | { type: 'OR' }
  | { type: 'NOT' }
  | { type: 'LPAREN' }
  | { type: 'RPAREN' }
  | { type: 'COLON' }
  | { type: 'EOF' };

export type LuceneNode =
  | { type: 'MATCH_ALL' }
  | { type: 'TERM'; field: string | null; value: string; negate: boolean }
  | { type: 'PHRASE'; field: string | null; value: string; negate: boolean }
  | { type: 'NOT'; child: LuceneNode }
  | { type: 'AND'; left: LuceneNode; right: LuceneNode }
  | { type: 'OR'; left: LuceneNode; right: LuceneNode };

// ── Tokenizer ──────────────────────────────────────────────────────────────

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    if (/\s/.test(input[i])) { i++; continue; }

    if (input[i] === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
    if (input[i] === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }
    if (input[i] === ':') { tokens.push({ type: 'COLON' }); i++; continue; }

    // Quoted phrase
    if (input[i] === '"') {
      i++;
      let phrase = '';
      while (i < input.length && input[i] !== '"') phrase += input[i++];
      if (i < input.length) i++; // closing "
      tokens.push({ type: 'PHRASE', value: phrase });
      continue;
    }

    // Leading minus = NOT
    if (input[i] === '-') {
      const prev = tokens[tokens.length - 1];
      const atWordBoundary = !prev || prev.type === 'LPAREN' || prev.type === 'AND' || prev.type === 'OR' || prev.type === 'NOT';
      if (atWordBoundary) { tokens.push({ type: 'NOT' }); i++; continue; }
    }

    // Term (includes *)
    let term = '';
    while (i < input.length && !/[\s():"\\]/.test(input[i])) term += input[i++];

    if (!term) { i++; continue; }

    const upper = term.toUpperCase();
    if (upper === 'AND') tokens.push({ type: 'AND' });
    else if (upper === 'OR') tokens.push({ type: 'OR' });
    else if (upper === 'NOT') tokens.push({ type: 'NOT' });
    else tokens.push({ type: 'TERM', value: term });
  }

  tokens.push({ type: 'EOF' });
  return tokens;
}

// ── Parser ─────────────────────────────────────────────────────────────────

class LuceneParser {
  private pos = 0;
  private tokens: Token[];
  constructor(tokens: Token[]) { this.tokens = tokens; }

  private peek(): Token { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }
  private isEnd(): boolean { return this.peek().type === 'EOF' || this.peek().type === 'RPAREN'; }

  parse(): LuceneNode {
    if (this.peek().type === 'EOF') return { type: 'MATCH_ALL' };
    return this.parseOr();
  }

  private parseOr(): LuceneNode {
    let left = this.parseAnd();
    while (!this.isEnd() && this.peek().type === 'OR') {
      this.consume();
      const right = this.parseAnd();
      left = { type: 'OR', left, right };
    }
    return left;
  }

  private parseAnd(): LuceneNode {
    let left = this.parseNot();
    while (!this.isEnd() && this.peek().type !== 'OR') {
      if (this.peek().type === 'AND') {
        this.consume();
        const right = this.parseNot();
        left = { type: 'AND', left, right };
      } else if (
        this.peek().type === 'NOT' ||
        this.peek().type === 'TERM' ||
        this.peek().type === 'PHRASE' ||
        this.peek().type === 'LPAREN'
      ) {
        // Implicit AND
        const right = this.parseNot();
        left = { type: 'AND', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseNot(): LuceneNode {
    if (this.peek().type === 'NOT') {
      this.consume();
      const child = this.parsePrimary();
      return { type: 'NOT', child };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): LuceneNode {
    const tok = this.peek();

    if (tok.type === 'LPAREN') {
      this.consume();
      const inner = this.parseOr();
      if (this.peek().type === 'RPAREN') this.consume();
      return inner;
    }

    if (tok.type === 'PHRASE') {
      this.consume();
      return { type: 'PHRASE', field: null, value: tok.value, negate: false };
    }

    if (tok.type === 'TERM') {
      this.consume();
      // field:value or field:"phrase"
      if (this.peek().type === 'COLON') {
        this.consume();
        const valTok = this.peek();
        if (valTok.type === 'TERM') {
          this.consume();
          return { type: 'TERM', field: tok.value, value: valTok.value, negate: false };
        }
        if (valTok.type === 'PHRASE') {
          this.consume();
          return { type: 'PHRASE', field: tok.value, value: valTok.value, negate: false };
        }
      }
      return { type: 'TERM', field: null, value: tok.value, negate: false };
    }

    this.consume();
    return { type: 'MATCH_ALL' };
  }
}

// ── Evaluator ──────────────────────────────────────────────────────────────

const SKIP_KEYS = new Set(['_id', '_index', '_sortMs']);

function matchWildcard(fieldValue: string, pattern: string): boolean {
  const val = fieldValue.toLowerCase();
  const pat = pattern.toLowerCase();
  if (!pat.includes('*')) return val.includes(pat);

  // Simple glob matching
  const parts = pat.split('*').filter(Boolean);
  if (parts.length === 0) return true; // "*" matches everything
  let pos = 0;
  for (const part of parts) {
    const idx = val.indexOf(part, pos);
    if (idx === -1) return false;
    pos = idx + part.length;
  }
  return true;
}

function allFieldValues(hit: Record<string, unknown>): string[] {
  return Object.entries(hit)
    .filter(([k]) => !SKIP_KEYS.has(k))
    .map(([, v]) => String(v ?? ''));
}

function getFieldValue(hit: Record<string, unknown>, field: string): string {
  return String(hit[field] ?? '');
}

function evaluate(node: LuceneNode, hit: Record<string, unknown>): boolean {
  switch (node.type) {
    case 'MATCH_ALL': return true;

    case 'TERM': {
      const match = node.field
        ? matchWildcard(getFieldValue(hit, node.field), node.value)
        : allFieldValues(hit).some(v => matchWildcard(v, node.value));
      return node.negate ? !match : match;
    }

    case 'PHRASE': {
      const phrase = node.value.toLowerCase();
      const match = node.field
        ? getFieldValue(hit, node.field).toLowerCase().includes(phrase)
        : allFieldValues(hit).some(v => v.toLowerCase().includes(phrase));
      return node.negate ? !match : match;
    }

    case 'NOT': return !evaluate(node.child, hit);
    case 'AND': return evaluate(node.left, hit) && evaluate(node.right, hit);
    case 'OR': return evaluate(node.left, hit) || evaluate(node.right, hit);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export function parseLuceneQuery(query: string): LuceneNode {
  if (!query.trim()) return { type: 'MATCH_ALL' };
  try {
    const tokens = tokenize(query);
    return new LuceneParser(tokens).parse();
  } catch {
    // Fallback to plain text search
    return { type: 'TERM', field: null, value: query, negate: false };
  }
}

export function evaluateLuceneQuery(node: LuceneNode, hit: Record<string, unknown>): boolean {
  return evaluate(node, hit);
}

/** Extract plain-text terms to use for highlighting */
export function extractHighlightTerms(node: LuceneNode): string[] {
  switch (node.type) {
    case 'MATCH_ALL': return [];
    case 'TERM': return node.negate ? [] : [node.value.replace(/\*/g, '')].filter(Boolean);
    case 'PHRASE': return node.negate ? [] : [node.value].filter(Boolean);
    case 'NOT': return [];
    case 'AND': return [...extractHighlightTerms(node.left), ...extractHighlightTerms(node.right)];
    case 'OR': return [...extractHighlightTerms(node.left), ...extractHighlightTerms(node.right)];
  }
}
