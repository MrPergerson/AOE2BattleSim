import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getCivs, getTechTree } from "../api/data";
import type { Civ, TechTree as TechTreeData, TechTreeNode } from "../types";

const AGES = [1, 2, 3, 4];
const AGE_LABELS: Record<number, string> = {
  1: "Dark Age",
  2: "Feudal Age",
  3: "Castle Age",
  4: "Imperial Age",
};

interface Row {
  key: string;
  label: string;
  nodes: TechTreeNode[];
}

function buildRows(tree: TechTreeData): { buildingsRow: TechTreeNode[]; unitRows: Row[] } {
  const buildingName = new Map(tree.buildings.map((b) => [b.id, b.name]));

  const byBuilding = new Map<number, TechTreeNode[]>();
  for (const node of tree.units) {
    const key = node.building_id ?? -1;
    if (!byBuilding.has(key)) byBuilding.set(key, []);
    byBuilding.get(key)!.push(node);
  }

  const unitRows = [...byBuilding.entries()]
    .map(([buildingId, nodes]) => ({
      key: String(buildingId),
      label: buildingName.get(buildingId) ?? "Other",
      nodes,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { buildingsRow: tree.buildings, unitRows };
}

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function TechTree() {
  const [civs, setCivs] = useState<Civ[]>([]);
  const [civId, setCivId] = useState<number | null>(null);
  const [tree, setTree] = useState<TechTreeData | null>(null);
  const [lines, setLines] = useState<Line[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<number, HTMLDivElement>());

  useEffect(() => {
    getCivs().then((fetched) => {
      const playable = fetched.filter((c) => c.id !== 0);
      setCivs(playable);
      setCivId(playable[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (civId === null) return;
    nodeRefs.current.clear();
    getTechTree(civId).then(setTree);
  }, [civId]);

  useLayoutEffect(() => {
    if (!tree || !containerRef.current) {
      setLines([]);
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const allNodes = [...tree.buildings, ...tree.units];
    const computed: Line[] = [];

    for (const node of allNodes) {
      if (node.link_id === null) continue;
      const fromEl = nodeRefs.current.get(node.link_id);
      const toEl = nodeRefs.current.get(node.id);
      if (!fromEl || !toEl) continue;
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      computed.push({
        x1: fromRect.right - containerRect.left,
        y1: fromRect.top + fromRect.height / 2 - containerRect.top,
        x2: toRect.left - containerRect.left,
        y2: toRect.top + toRect.height / 2 - containerRect.top,
      });
    }
    setLines(computed);
  }, [tree]);

  const { buildingsRow, unitRows } = tree
    ? buildRows(tree)
    : { buildingsRow: [], unitRows: [] as Row[] };

  return (
    <div className="tech-tree">
      <select
        value={civId ?? ""}
        onChange={(e) => setCivId(Number(e.target.value))}
      >
        {civs.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {tree && (
        <div className="tt-diagram" ref={containerRef}>
          <svg className="tt-lines">
            {lines.map((line, i) => (
              <line
                key={i}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
              />
            ))}
          </svg>

          <div className="tt-age-headers">
            <div className="tt-row-label" />
            {AGES.map((age) => (
              <div key={age} className="tt-age-header">
                {AGE_LABELS[age]}
              </div>
            ))}
          </div>

          <TechRow label="Buildings" nodes={buildingsRow} nodeRefs={nodeRefs} />
          {unitRows.map((row) => (
            <TechRow key={row.key} label={row.label} nodes={row.nodes} nodeRefs={nodeRefs} />
          ))}
        </div>
      )}
    </div>
  );
}

function TechRow({
  label,
  nodes,
  nodeRefs,
}: {
  label: string;
  nodes: TechTreeNode[];
  nodeRefs: React.RefObject<Map<number, HTMLDivElement>>;
}) {
  return (
    <div className="tt-row">
      <div className="tt-row-label">{label}</div>
      {AGES.map((age) => (
        <div key={age} className="tt-cell">
          {nodes
            .filter((n) => n.age === age)
            .map((n) => (
              <div
                key={n.id}
                ref={(el) => {
                  if (el) nodeRefs.current.set(n.id, el);
                }}
                className={`tt-node tt-status-${n.status}`}
              >
                {n.name}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
