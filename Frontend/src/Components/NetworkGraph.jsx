import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaMinus, FaProjectDiagram, FaSearch, FaSearchPlus, FaUsers, FaPlus } from "react-icons/fa";
import api from "../services/api";

const WIDTH = 900;
const HEIGHT = 560;

function NetworkGraph() {
  const [graph, setGraph] = useState({ nodes: [], edges: [], summary: {} });
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("all");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  useEffect(() => {
    api.get("/network/graph")
      .then(({ data }) => {
        setGraph(data.data);
        setSelected(data.data.nodes.find((node) => node.isCurrentUser) || data.data.nodes[0]);
      })
      .catch(() => setError("Unable to load the network graph."))
      .finally(() => setLoading(false));
  }, []);

  const companies = useMemo(() => [...new Set(graph.nodes.map((node) => node.company).filter(Boolean))].sort(), [graph.nodes]);
  const filteredNodes = useMemo(() => graph.nodes.filter((node) => {
    const haystack = `${node.name} ${node.company} ${node.branch} ${node.location}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (company === "all" || node.company === company);
  }), [graph.nodes, search, company]);
  const positioned = useMemo(() => {
    const current = filteredNodes.find((node) => node.isCurrentUser);
    const others = filteredNodes.filter((node) => !node.isCurrentUser);
    const nodes = current ? [current, ...others] : others;
    return nodes.map((node, index) => {
      if (node.isCurrentUser) return { ...node, x: WIDTH / 2, y: HEIGHT / 2 };
      const offset = current ? index - 1 : index;
      const ring = offset < 18 ? 1 : 2;
      const ringItems = ring === 1 ? Math.min(18, others.length) : Math.max(1, others.length - 18);
      const ringIndex = ring === 1 ? offset : offset - 18;
      const angle = (ringIndex / ringItems) * Math.PI * 2 - Math.PI / 2;
      const radius = ring === 1 ? 175 : 255;
      return { ...node, x: WIDTH / 2 + Math.cos(angle) * radius, y: HEIGHT / 2 + Math.sin(angle) * radius };
    });
  }, [filteredNodes]);
  const nodeMap = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);
  const visibleEdges = graph.edges.filter((edge) => filter === "all" || edge.type === filter);
  const pathToSelected = useMemo(() => {
    const start = graph.nodes.find((node) => node.isCurrentUser)?.id;
    if (!start || !selected || selected.id === start) return [];
    const adjacency = new Map();
    graph.edges.filter((edge) => edge.type === "connection").forEach(({ source, target }) => {
      adjacency.set(source, [...(adjacency.get(source) || []), target]);
      adjacency.set(target, [...(adjacency.get(target) || []), source]);
    });
    const queue = [[start]];
    const seen = new Set([start]);
    while (queue.length) {
      const path = queue.shift();
      const last = path[path.length - 1];
      if (last === selected.id) return path;
      for (const next of adjacency.get(last) || []) {
        if (!seen.has(next)) { seen.add(next); queue.push([...path, next]); }
      }
    }
    return [];
  }, [graph.edges, graph.nodes, selected]);
  const mutualCount = useMemo(() => {
    const current = graph.nodes.find((node) => node.isCurrentUser)?.id;
    if (!current || !selected || selected.id === current) return 0;
    const neighbours = (id) => new Set(graph.edges.filter((edge) => edge.type === "connection" && [edge.source, edge.target].includes(id)).map((edge) => edge.source === id ? edge.target : edge.source));
    const mine = neighbours(current);
    return [...neighbours(selected.id)].filter((id) => mine.has(id)).length;
  }, [graph.edges, graph.nodes, selected]);

  return (
    <main className="px-4 py-9">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-5 rounded-[2rem] bg-gradient-to-br from-indigo-950 to-indigo-700 p-7 text-white md:flex-row md:items-end md:p-9">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-300">Interactive relationship map</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">Explore the alumni network</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-indigo-100">
              Direct connections use solid lines. Dotted discovery links reveal shared companies and branches.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["People", graph.summary.people], ["Connected", graph.summary.connections], ["Discover", graph.summary.discoveryLinks]].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/10 px-4 py-3"><strong className="block text-xl">{value || 0}</strong><span className="text-[10px] font-bold uppercase">{label}</span></div>
            ))}
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          {[["all", "All links"], ["connection", "Direct connections"], ["similarity", "Discovery links"]].map(([value, label]) => (
            <button key={value} onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-2 text-sm font-extrabold ${filter === value ? "bg-indigo-600 text-white" : "bg-white text-slate-600"}`}>
              {label}
            </button>
          ))}
          <label className="ml-auto flex min-w-56 items-center gap-2 rounded-xl bg-white px-4 py-2 text-slate-500">
            <FaSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search graph" className="w-full bg-transparent text-sm font-bold outline-none" />
          </label>
          <select value={company} onChange={(event) => setCompany(event.target.value)} className="rounded-xl border-0 bg-white px-4 py-2 text-sm font-bold text-slate-600">
            <option value="all">All companies</option>
            {companies.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.65, value - 0.15))} className="rounded-xl bg-white p-3 text-indigo-700"><FaMinus /></button>
          <span className="min-w-12 text-center text-xs font-black text-slate-500">{Math.round(zoom * 100)}%</span>
          <button aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.8, value + 0.15))} className="rounded-xl bg-white p-3 text-indigo-700"><FaPlus /></button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600">Reset view</button>
        </div>

        {loading && <div className="surface-card p-10 text-center font-bold">Building the graph…</div>}
        {error && <div className="rounded-xl bg-red-50 p-5 font-bold text-red-700">{error}</div>}
        {!loading && !error && (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="surface-card overflow-hidden bg-slate-950 p-2">
              {!positioned.length ? (
                <div className="grid min-h-[520px] place-items-center text-center text-slate-300"><div><FaUsers className="mx-auto text-4xl" /><p className="mt-3 font-bold">Add alumni profiles to grow the graph.</p></div></div>
              ) : (
                <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto min-h-[520px] w-full cursor-grab touch-none active:cursor-grabbing" role="img" aria-label="Interactive alumni relationship graph"
                  onPointerDown={(event) => { drag.current = { x: event.clientX, y: event.clientY, pan }; event.currentTarget.setPointerCapture(event.pointerId); }}
                  onPointerMove={(event) => { if (drag.current) setPan({ x: drag.current.pan.x + event.clientX - drag.current.x, y: drag.current.pan.y + event.clientY - drag.current.y }); }}
                  onPointerUp={() => { drag.current = null; }}
                  onWheel={(event) => { event.preventDefault(); setZoom((value) => Math.min(1.8, Math.max(0.65, value + (event.deltaY < 0 ? 0.1 : -0.1)))); }}>
                  <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
                  <g transform={`translate(${WIDTH * (1 - zoom) / 2 + pan.x} ${HEIGHT * (1 - zoom) / 2 + pan.y}) scale(${zoom})`}>
                  {visibleEdges.map((edge, index) => {
                    const source = nodeMap.get(edge.source); const target = nodeMap.get(edge.target);
                    if (!source || !target) return null;
                    return <line key={`${edge.source}-${edge.target}-${index}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                      stroke={edge.type === "connection" ? "#2dd4bf" : "#64748b"} strokeWidth={edge.type === "connection" ? 2.2 : 1}
                      strokeDasharray={edge.type === "similarity" ? "5 7" : undefined} opacity={edge.type === "connection" ? 0.72 : 0.35} />;
                  })}
                  {positioned.map((node) => (
                    <g key={node.id} transform={`translate(${node.x} ${node.y})`} onClick={() => setSelected(node)} className="cursor-pointer">
                      <circle r={node.isCurrentUser ? 27 : selected?.id === node.id ? 22 : 16} fill={node.isCurrentUser ? "#2dd4bf" : selected?.id === node.id ? "#818cf8" : "#4f46e5"}
                        stroke="#fff" strokeWidth={node.isCurrentUser ? 4 : 2} filter={node.isCurrentUser ? "url(#glow)" : undefined} />
                      <text y={node.isCurrentUser ? 44 : 34} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700">{node.name?.split(" ")[0]}</text>
                    </g>
                  ))}
                  </g>
                </svg>
              )}
            </div>
            <aside className="surface-card h-fit p-6">
              {selected ? (
                <>
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-600 text-xl font-black text-white">{selected.name?.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
                  <p className="mt-5 text-xs font-black uppercase tracking-wider text-indigo-600">{selected.isCurrentUser ? "You are here" : "Alumni profile"}</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">{selected.name}</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">{selected.designation}{selected.company ? ` at ${selected.company}` : ""}</p>
                  <div className="mt-5 space-y-2 text-sm font-bold text-slate-600">
                    <p>{selected.branch || "Branch not listed"} · {selected.batch || "Batch not listed"}</p>
                    <p>{selected.location || "Location not listed"}</p>
                    {!selected.isCurrentUser && <p className="rounded-lg bg-indigo-50 p-3 text-indigo-700">{mutualCount} mutual connection{mutualCount === 1 ? "" : "s"}</p>}
                    {!selected.isCurrentUser && <p className="rounded-lg bg-teal-50 p-3 text-teal-800">{pathToSelected.length ? `${pathToSelected.length - 1} hop connection path` : "No direct connection path yet"}</p>}
                  </div>
                  {!selected.isCurrentUser && <Link to="/alumni-directory" className="primary-button mt-6 w-full"><FaSearchPlus /> View directory</Link>}
                </>
              ) : <p className="font-bold text-slate-500"><FaProjectDiagram className="mb-3 text-2xl" />Select a person to inspect their profile.</p>}
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}

export default NetworkGraph;
