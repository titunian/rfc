// ── Force-directed concept graph ────────────────────────────────
//
// Renders an interactive SVG knowledge graph using d3-force.
// Nodes = concepts, edges = shared document co-occurrence.

import { useEffect, useRef, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { select } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import { drag } from "d3-drag";
import { useConceptsStore, type ConceptEntry } from "../../stores/concepts-store";
import type { ConceptType } from "../../lib/extract-concepts";

// ── Color mapping ───────────────────────────────────────────────

const TYPE_COLORS: Record<ConceptType, string> = {
  system: "#3b82f6",   // blue
  decision: "#f59e0b", // amber
  pattern: "#a855f7",  // purple
  question: "#22c55e", // green
  person: "#f43f5e",   // rose
};

const TYPE_LABELS: Record<ConceptType, string> = {
  system: "System",
  decision: "Decision",
  pattern: "Pattern",
  question: "Question",
  person: "Person",
};

// ── Types ───────────────────────────────────────────────────────

interface GraphNode extends SimulationNodeDatum {
  id: string;
  name: string;
  type: ConceptType;
  planCount: number;
  radius: number;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
}

// ── Helpers ─────────────────────────────────────────────────────

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "\u2026" : s;
}

function buildGraph(entries: ConceptEntry[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = entries.map((e) => {
    const r = Math.min(24, Math.max(8, 6 + e.planIds.length * 3));
    return {
      id: e.concept.name.toLowerCase(),
      name: e.concept.name,
      type: e.concept.type,
      planCount: e.planIds.length,
      radius: r,
    };
  });

  // Build a map: planId -> list of concept ids in that plan
  const planToConcepts = new Map<string, string[]>();
  for (const e of entries) {
    const cid = e.concept.name.toLowerCase();
    for (const pid of e.planIds) {
      const arr = planToConcepts.get(pid);
      if (arr) arr.push(cid);
      else planToConcepts.set(pid, [cid]);
    }
  }

  // For each plan, create edges between all pairs of concepts in that plan
  const edgeWeights = new Map<string, number>();
  for (const concepts of planToConcepts.values()) {
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const key = [concepts[i], concepts[j]].sort().join("\0");
        edgeWeights.set(key, (edgeWeights.get(key) || 0) + 1);
      }
    }
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const links: GraphLink[] = [];
  for (const [key, weight] of edgeWeights) {
    const [src, tgt] = key.split("\0");
    if (nodeIds.has(src) && nodeIds.has(tgt)) {
      links.push({ source: src, target: tgt, weight });
    }
  }

  return { nodes, links };
}

// ── Component ───────────────────────────────────────────────────

interface ConceptGraphProps {
  /** If set, nodes matching this query are highlighted */
  filterQuery?: string;
}

export function ConceptGraph({ filterQuery }: ConceptGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null);

  const allEntries = useConceptsStore((s) => s.allEntries)();

  const destroySimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return;

    destroySimulation();

    const { nodes, links } = buildGraph(allEntries);
    if (nodes.length === 0) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous SVG content
    const svgSel = select(svg);
    svgSel.selectAll("*").remove();
    svgSel.attr("width", width).attr("height", height);

    // Container group for zoom/pan
    const g = svgSel.append("g");

    // Zoom behavior
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svgSel.call(zoomBehavior);
    svgSel.call(zoomBehavior.transform, zoomIdentity);

    // Tooltip div (appended to container)
    let tooltip = select(container).select<HTMLDivElement>(".concept-graph-tooltip");
    if (tooltip.empty()) {
      tooltip = select(container)
        .append("div")
        .attr("class", "concept-graph-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("padding", "6px 10px")
        .style("border-radius", "8px")
        .style("font-size", "11px")
        .style("line-height", "1.4")
        .style("z-index", "50")
        .style("background", "var(--bg-elevated)")
        .style("border", "1px solid var(--border)")
        .style("box-shadow", "var(--shadow-md)")
        .style("color", "var(--fg)");
    }

    // Links
    const linkSel = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "var(--border-subtle)")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", (d) => Math.min(4, 0.5 + d.weight));

    // Node groups
    const nodeSel = g
      .append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "grab");

    // Circles
    nodeSel
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => TYPE_COLORS[d.type])
      .attr("fill-opacity", 0.85)
      .attr("stroke", (d) => TYPE_COLORS[d.type])
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.4);

    // Labels
    nodeSel
      .append("text")
      .text((d) => truncate(d.name, 20))
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.radius + 12)
      .attr("fill", "var(--fg-tertiary)")
      .attr("font-size", 10)
      .attr("font-family", "inherit")
      .style("pointer-events", "none");

    // Hover
    nodeSel
      .on("mouseenter", function (_event, d) {
        // Highlight node
        select(this).select("circle").attr("fill-opacity", 1).attr("stroke-opacity", 1).attr("stroke-width", 3);

        // Dim other nodes and edges
        const connectedIds = new Set<string>();
        connectedIds.add(d.id);
        links.forEach((l) => {
          const sid = typeof l.source === "string" ? l.source : l.source.id;
          const tid = typeof l.target === "string" ? l.target : l.target.id;
          if (sid === d.id) connectedIds.add(tid);
          if (tid === d.id) connectedIds.add(sid);
        });

        nodeSel.select("circle").attr("fill-opacity", (n) => (connectedIds.has(n.id) ? 0.85 : 0.2));
        linkSel.attr("stroke-opacity", (l) => {
          const sid = typeof l.source === "string" ? l.source : l.source.id;
          const tid = typeof l.target === "string" ? l.target : l.target.id;
          return sid === d.id || tid === d.id ? 0.8 : 0.08;
        });

        // Tooltip
        tooltip
          .html(
            `<strong style="color:${TYPE_COLORS[d.type]}">${d.name}</strong><br/>` +
              `<span style="color:var(--fg-tertiary)">${TYPE_LABELS[d.type]}</span> &middot; ` +
              `<span style="color:var(--fg-secondary)">${d.planCount} plan${d.planCount !== 1 ? "s" : ""}</span>`
          )
          .style("opacity", 1);
      })
      .on("mousemove", function (event) {
        const rect = container.getBoundingClientRect();
        tooltip
          .style("left", event.clientX - rect.left + 14 + "px")
          .style("top", event.clientY - rect.top - 10 + "px");
      })
      .on("mouseleave", function () {
        nodeSel.select("circle").attr("fill-opacity", 0.85).attr("stroke-opacity", 0.4).attr("stroke-width", 1.5);
        linkSel.attr("stroke-opacity", 0.5);
        tooltip.style("opacity", 0);
      });

    // Click: dispatch custom event
    nodeSel.on("click", (_event, d) => {
      const customEvent = new CustomEvent("concept-graph:select", {
        detail: { conceptName: d.name, conceptType: d.type },
      });
      window.dispatchEvent(customEvent);
    });

    // Drag behavior
    const dragBehavior = drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        select(event.sourceEvent.target.closest("g")).attr("cursor", "grabbing");
      })
      .on("drag", (_event, d) => {
        d.fx = _event.x;
        d.fy = _event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        select(event.sourceEvent.target.closest("g")).attr("cursor", "grab");
      });

    nodeSel.call(dragBehavior);

    // Force simulation
    const simulation = forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(80)
      )
      .force("charge", forceManyBody<GraphNode>().strength(-120))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide<GraphNode>().radius((d) => d.radius + 4))
      .on("tick", () => {
        linkSel
          .attr("x1", (d) => ((d.source as GraphNode).x ?? 0))
          .attr("y1", (d) => ((d.source as GraphNode).y ?? 0))
          .attr("x2", (d) => ((d.target as GraphNode).x ?? 0))
          .attr("y2", (d) => ((d.target as GraphNode).y ?? 0));

        nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    simulationRef.current = simulation;

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        svgSel.attr("width", w).attr("height", h);
        simulation.force("center", forceCenter(w / 2, h / 2));
        simulation.alpha(0.3).restart();
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      destroySimulation();
      tooltip.remove();
    };
  }, [allEntries, destroySimulation]);

  // Filter highlighting: update node opacity when filterQuery changes
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const q = (filterQuery ?? "").toLowerCase().trim();

    const svgSel = select(svg);
    if (!q) {
      svgSel.selectAll<SVGGElement, GraphNode>("g g g").select("circle").attr("fill-opacity", 0.85);
      svgSel.selectAll<SVGGElement, GraphNode>("g g g").select("text").attr("fill-opacity", 1);
      return;
    }

    svgSel.selectAll<SVGGElement, GraphNode>("g g g").each(function (d) {
      const match = d.name.toLowerCase().includes(q) || d.type.includes(q);
      select(this).select("circle").attr("fill-opacity", match ? 1 : 0.15);
      select(this).select("text").attr("fill-opacity", match ? 1 : 0.3);
    });
  }, [filterQuery]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ minHeight: 200 }}
    >
      {allEntries.length === 0 ? (
        <p
          className="absolute inset-0 flex items-center justify-center text-[11.5px]"
          style={{ color: "var(--fg-tertiary)" }}
        >
          No concepts extracted yet. Open a document to begin.
        </p>
      ) : (
        <svg ref={svgRef} className="block w-full h-full" />
      )}
    </div>
  );
}
