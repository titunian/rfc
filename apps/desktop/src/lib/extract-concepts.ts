// ── Client-side concept extractor ────────────────────────────────
//
// Scans markdown for KEY concepts — systems, decisions, patterns,
// questions, and people — and returns a deduplicated list capped at 30.

export type ConceptType = "system" | "decision" | "pattern" | "question" | "person";

export interface Concept {
  name: string;
  type: ConceptType;
  context: string; // surrounding sentence or heading
}

// Well-known tech names we'll recognise inside backticks.
const KNOWN_TECH = new Set([
  "redis", "postgresql", "postgres", "mysql", "mongodb", "dynamodb",
  "elasticsearch", "kafka", "rabbitmq", "nats", "pulsar",
  "kubernetes", "k8s", "docker", "terraform", "ansible", "nginx",
  "envoy", "istio", "consul", "vault", "nomad",
  "react", "vue", "angular", "svelte", "nextjs", "next.js", "nuxt",
  "remix", "vite", "webpack", "esbuild", "rollup",
  "node", "nodejs", "node.js", "deno", "bun",
  "python", "django", "flask", "fastapi",
  "go", "golang", "rust", "java", "kotlin", "swift",
  "typescript", "javascript", "graphql", "grpc", "rest",
  "aws", "gcp", "azure", "cloudflare", "vercel", "fly.io",
  "s3", "lambda", "ec2", "ecs", "fargate", "rds", "sqs", "sns",
  "datadog", "prometheus", "grafana", "sentry", "opentelemetry",
  "github", "gitlab", "bitbucket", "jenkins", "circleci",
  "prisma", "drizzle", "typeorm", "sequelize", "knex",
  "tailwind", "tailwindcss", "css", "sass",
  "supabase", "firebase", "planetscale", "neon",
  "stripe", "auth0", "clerk", "okta",
  "tiptap", "prosemirror", "codemirror", "monaco",
  "zod", "joi", "yup", "ajv",
  "zustand", "redux", "mobx", "jotai", "recoil",
  "trpc", "hono", "express", "fastify", "koa",
  "sqlite", "cockroachdb", "cassandra", "scylla",
  "linux", "macos", "windows", "wasm", "webassembly",
  "tauri", "electron",
]);

// Looks like a technology name: starts with uppercase, or is a known tech term
function looksLikeTechName(s: string): boolean {
  const lower = s.toLowerCase().trim();
  if (KNOWN_TECH.has(lower)) return true;
  // PascalCase or UPPER_CASE or contains dots/dashes (e.g. "next.js", "fly.io")
  if (/^[A-Z]/.test(s)) return true;
  if (/[.\-/]/.test(s) && s.length >= 3) return true;
  return false;
}

// Decision trigger phrases
const DECISION_TRIGGERS = [
  "decided", "chose", "trade-off", "tradeoff", "instead of",
  "went with", "opted for", "picked", "selected",
  "we chose", "we decided", "we went",
];

function extractSentenceAround(text: string, matchIndex: number): string {
  // Find sentence boundaries around the match
  let start = matchIndex;
  let end = matchIndex;
  // Walk backwards to sentence start
  while (start > 0 && !/[.!?\n]/.test(text[start - 1])) start--;
  // Walk forwards to sentence end
  while (end < text.length && !/[.!?\n]/.test(text[end])) end++;
  return text.slice(start, end + 1).trim().slice(0, 200);
}

function extractDecisionPhrase(sentence: string): string {
  // Try to extract a meaningful phrase from the decision sentence
  // Remove common prefixes like "We decided to", "We chose", etc.
  let phrase = sentence;
  for (const trigger of DECISION_TRIGGERS) {
    const idx = phrase.toLowerCase().indexOf(trigger);
    if (idx !== -1) {
      // Take from the trigger word onwards, up to a reasonable length
      phrase = phrase.slice(idx).slice(0, 120);
      break;
    }
  }
  // Clean up: strip trailing punctuation, trim
  return phrase.replace(/[.!?]+$/, "").trim() || sentence.slice(0, 80);
}

export function extractConcepts(markdown: string): Concept[] {
  const seen = new Map<string, Concept>(); // lowercase name -> Concept
  const results: Concept[] = [];

  function add(concept: Concept) {
    if (results.length >= 30) return;
    const key = concept.name.toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.set(key, concept);
    results.push(concept);
  }

  // ── Systems: words/phrases in backticks, 2+ chars, look like tech names
  const codeRe = /`([^`\n]{2,60})`/g;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(markdown)) !== null) {
    const name = m[1].trim();
    // Skip things that look like code snippets (contain spaces + operators)
    if (/[=(){}\[\];]/.test(name)) continue;
    if (name.split(/\s+/).length > 4) continue;
    if (looksLikeTechName(name)) {
      add({
        name,
        type: "system",
        context: extractSentenceAround(markdown, m.index),
      });
    }
  }

  // ── Decisions: sentences containing decision trigger phrases
  const lines = markdown.split("\n");
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const trigger of DECISION_TRIGGERS) {
      if (lower.includes(trigger)) {
        const phrase = extractDecisionPhrase(line);
        if (phrase.length >= 10) {
          add({
            name: phrase,
            type: "decision",
            context: line.trim().slice(0, 200),
          });
        }
        break; // one decision per line
      }
    }
  }

  // ── Patterns: text inside **bold** under h2/h3 headings
  // We scan line-by-line; when under an h2/h3, capture bold text
  let underHeading = false;
  let currentHeading = "";
  for (const line of lines) {
    if (/^#{2,3}\s+/.test(line)) {
      underHeading = true;
      currentHeading = line.replace(/^#{2,3}\s+/, "").trim();
      continue;
    }
    if (/^#\s+/.test(line) || /^#{4,}\s+/.test(line)) {
      underHeading = false;
      continue;
    }
    if (underHeading) {
      const boldRe = /\*\*([^*]{2,80})\*\*/g;
      let bm: RegExpExecArray | null;
      while ((bm = boldRe.exec(line)) !== null) {
        const name = bm[1].trim();
        if (name.length >= 3) {
          add({
            name,
            type: "pattern",
            context: currentHeading,
          });
        }
      }
    }
  }

  // ── Questions: lines ending with ? (skip very short ones < 10 chars)
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.endsWith("?") && trimmed.length >= 10) {
      // Strip leading markdown (list markers, heading markers)
      const clean = trimmed
        .replace(/^[-*+]\s+/, "")
        .replace(/^#{1,6}\s+/, "")
        .replace(/^\d+\.\s+/, "")
        .trim();
      if (clean.length >= 10) {
        add({
          name: clean,
          type: "question",
          context: clean,
        });
      }
    }
  }

  // ── People: @mentions or "Name <email>" patterns
  const mentionRe = /@([a-zA-Z][\w.-]{1,30})/g;
  while ((m = mentionRe.exec(markdown)) !== null) {
    add({
      name: `@${m[1]}`,
      type: "person",
      context: extractSentenceAround(markdown, m.index),
    });
  }

  const emailNameRe = /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\s+<([^>]+@[^>]+)>/g;
  while ((m = emailNameRe.exec(markdown)) !== null) {
    add({
      name: m[1].trim(),
      type: "person",
      context: `${m[1].trim()} <${m[2]}>`,
    });
  }

  return results;
}
