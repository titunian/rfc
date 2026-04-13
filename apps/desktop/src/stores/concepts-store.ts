// ── Concepts store ───────────────────────────────────────────────
//
// Indexes concepts extracted from documents. Each concept tracks which
// plans/files reference it, enabling cross-document knowledge graph queries.

import { create } from "zustand";
import { extractConcepts, type Concept } from "../lib/extract-concepts";
import type { AIAnalysisResult } from "../lib/ai-analyze";

export interface ConceptEntry {
  concept: Concept;
  planIds: string[];
  planTitles: string[];
}

interface ConceptsState {
  /** Map from lowercase concept name -> entry */
  concepts: Map<string, ConceptEntry>;

  /** Extract concepts from content and merge into the index */
  extractAndIndex: (planId: string, planTitle: string, content: string) => void;

  /** Get all concepts found in a specific plan */
  getConceptsForPlan: (planId: string) => Concept[];

  /** Get all plans that reference a given concept name */
  getPlansForConcept: (name: string) => { planId: string; planTitle: string }[];

  /** Search concepts by query string (fuzzy prefix match) */
  searchConcepts: (query: string) => ConceptEntry[];

  /** Merge AI-extracted concepts into the index for a given plan */
  mergeAIConcepts: (planId: string, planTitle: string, result: AIAnalysisResult) => void;

  /** Get all entries as an array */
  allEntries: () => ConceptEntry[];
}

export const useConceptsStore = create<ConceptsState>((set, get) => ({
  concepts: new Map(),

  extractAndIndex: (planId: string, planTitle: string, content: string) => {
    const extracted = extractConcepts(content);

    set((state) => {
      const next = new Map(state.concepts);

      // First, remove this planId from any entries that previously referenced it
      // (the document may have changed and no longer contains some concepts)
      for (const [key, entry] of next) {
        const idx = entry.planIds.indexOf(planId);
        if (idx !== -1) {
          const newPlanIds = [...entry.planIds];
          const newPlanTitles = [...entry.planTitles];
          newPlanIds.splice(idx, 1);
          newPlanTitles.splice(idx, 1);
          if (newPlanIds.length === 0) {
            next.delete(key);
          } else {
            next.set(key, {
              ...entry,
              planIds: newPlanIds,
              planTitles: newPlanTitles,
            });
          }
        }
      }

      // Now add the freshly-extracted concepts
      for (const concept of extracted) {
        const key = concept.name.toLowerCase().trim();
        const existing = next.get(key);
        if (existing) {
          if (!existing.planIds.includes(planId)) {
            next.set(key, {
              concept: existing.concept,
              planIds: [...existing.planIds, planId],
              planTitles: [...existing.planTitles, planTitle],
            });
          }
        } else {
          next.set(key, {
            concept,
            planIds: [planId],
            planTitles: [planTitle],
          });
        }
      }

      return { concepts: next };
    });
  },

  getConceptsForPlan: (planId: string) => {
    const results: Concept[] = [];
    for (const entry of get().concepts.values()) {
      if (entry.planIds.includes(planId)) {
        results.push(entry.concept);
      }
    }
    return results;
  },

  getPlansForConcept: (name: string) => {
    const key = name.toLowerCase().trim();
    const entry = get().concepts.get(key);
    if (!entry) return [];
    return entry.planIds.map((id, i) => ({
      planId: id,
      planTitle: entry.planTitles[i],
    }));
  },

  searchConcepts: (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return get().allEntries();
    const results: ConceptEntry[] = [];
    for (const entry of get().concepts.values()) {
      if (
        entry.concept.name.toLowerCase().includes(q) ||
        entry.concept.context.toLowerCase().includes(q)
      ) {
        results.push(entry);
      }
    }
    return results;
  },

  mergeAIConcepts: (planId: string, planTitle: string, result: AIAnalysisResult) => {
    set((state) => {
      const next = new Map(state.concepts);

      for (const c of result.concepts) {
        const key = c.name.toLowerCase().trim();
        if (!key) continue;
        const existing = next.get(key);
        if (existing) {
          if (!existing.planIds.includes(planId)) {
            next.set(key, {
              concept: existing.concept,
              planIds: [...existing.planIds, planId],
              planTitles: [...existing.planTitles, planTitle],
            });
          }
        } else {
          next.set(key, {
            concept: { name: c.name, type: c.type, context: c.context },
            planIds: [planId],
            planTitles: [planTitle],
          });
        }
      }

      return { concepts: next };
    });
  },

  allEntries: () => {
    return Array.from(get().concepts.values());
  },
}));
