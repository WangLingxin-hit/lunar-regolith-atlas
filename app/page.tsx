"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PageKey = "home" | "browse" | "model" | "classify" | "stats" | "about";
type ParticleClass = "胶结物" | "玻璃珠" | "岩屑" | "单矿物";
type ViewMode = "surface" | "points" | "wireframe";

type Particle = {
  id: string;
  prefix: "JJW" | "BLZ" | "YX" | "DKW";
  className: ParticleClass;
  sourceFile: string;
  meshFile: string;
};

const sourceFiles = [
  "BLZ_1_repair.stl", "BLZ_2_repair.stl", "BLZ_3_repair.stl", "BLZ_4_repair.stl", "BLZ_6_repair.stl",
  "DKW_26_repair_filter_5.stl", "DKW_102_repair_filter_5.stl", "DKW_106_repair_filter_5.stl", "DKW_114_repair_filter_5.stl", "DKW_122_repair_filter_5.stl",
  "JJW_13_repair_filter_5.stl", "JJW_14_repair_filter_5.stl", "JJW_18_repair_filter_5.stl", "JJW_23_repair_filter_5.stl", "JJW_57_repair_filter_5.stl",
  "YX_4_repair_filter_5.stl", "YX_7_repair_filter_5.stl", "YX_13_repair_filter_5.stl", "YX_48_repair_filter_5.stl", "YX_54_repair_filter_5.stl",
] as const;

const prefixToClass: Record<Particle["prefix"], ParticleClass> = {
  JJW: "胶结物",
  BLZ: "玻璃珠",
  YX: "岩屑",
  DKW: "单矿物",
};

const particles: Particle[] = sourceFiles.map((sourceFile) => {
  const [prefix, number] = sourceFile.split("_") as [Particle["prefix"], string];
  return {
    id: `${prefix}-${number}`,
    prefix,
    className: prefixToClass[prefix],
    sourceFile,
    meshFile: `/models/${sourceFile.replace(/\.stl$/, ".mesh")}`,
  };
});

const labels: ParticleClass[] = ["胶结物", "玻璃珠", "岩屑", "单矿物"];
const classMeta: Record<ParticleClass, { code: Particle["prefix"]; color: string }> = {
  胶结物: { code: "JJW", color: "#a74832" },
  玻璃珠: { code: "BLZ", color: "#657b8e" },
  岩屑: { code: "YX", color: "#17324d" },
  单矿物: { code: "DKW", color: "#9d8168" },
};

const classCount = (className: ParticleClass) => particles.filter((particle) => particle.className === className).length;
const featured = [particles[13], particles[1], particles[16]];
const assetBase = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type MeshData = { vertices: Float32Array; indices: Uint32Array };
const meshCache = new Map<string, Promise<MeshData>>();

function loadMesh(path: string): Promise<MeshData> {
  const url = `${assetBase}${path}`;
  const cached = meshCache.get(url);
  if (cached) return cached;

  const request = fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`无法读取模型 (${response.status})`);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 8) throw new Error("模型预览文件不完整");
    const header = new DataView(buffer, 0, 8);
    const vertexCount = header.getUint32(0, true);
    const indexCount = header.getUint32(4, true);
    const vertexEnd = 8 + vertexCount * 3 * 4;
    const expectedLength = vertexEnd + indexCount * 4;
    if (expectedLength !== buffer.byteLength) throw new Error("模型预览文件格式错误");
    return {
      vertices: new Float32Array(buffer.slice(8, vertexEnd)),
      indices: new Uint32Array(buffer.slice(vertexEnd)),
    };
  });
  meshCache.set(url, request);
  return request;
}

function useMesh(particle: Particle) {
  const [result, setResult] = useState<{ path: string; mesh?: MeshData; error?: string }>({ path: "" });

  useEffect(() => {
    let active = true;
    loadMesh(particle.meshFile)
      .then((mesh) => active && setResult({ path: particle.meshFile, mesh }))
      .catch((error: unknown) => active && setResult({ path: particle.meshFile, error: error instanceof Error ? error.message : "模型加载失败" }));
    return () => { active = false; };
  }, [particle]);

  return result.path === particle.meshFile
    ? { mesh: result.mesh, error: result.error }
    : { mesh: undefined, error: undefined };
}

function MeshCanvas({
  particle,
  mode = "surface",
  slice = 100,
  interactive = false,
  className = "",
}: {
  particle: Particle;
  mode?: ViewMode;
  slice?: number;
  interactive?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<() => void>(() => undefined);
  const view = useRef({ yaw: 0.6, pitch: -0.28, zoom: 1, dragging: false, x: 0, y: 0 });
  const { mesh, error } = useMesh(particle);

  useEffect(() => {
    view.current = { yaw: 0.6, pitch: -0.28, zoom: 1, dragging: false, x: 0, y: 0 };
  }, [particle]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mesh) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const bounds = canvas.getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const current = view.current;
    const cosY = Math.cos(current.yaw);
    const sinY = Math.sin(current.yaw);
    const cosP = Math.cos(current.pitch);
    const sinP = Math.sin(current.pitch);
    const scale = Math.min(width, height) * (interactive ? 0.39 : 0.42) * current.zoom;
    const projected = new Float32Array(mesh.vertices.length);

    for (let index = 0; index < mesh.vertices.length; index += 3) {
      const x = mesh.vertices[index];
      const y = mesh.vertices[index + 1];
      const z = mesh.vertices[index + 2];
      const rotatedX = x * cosY - z * sinY;
      const rotatedZ = x * sinY + z * cosY;
      const rotatedY = y * cosP - rotatedZ * sinP;
      projected[index] = width / 2 + rotatedX * scale;
      projected[index + 1] = height / 2 - rotatedY * scale;
      projected[index + 2] = y * sinP + rotatedZ * cosP;
    }

    const clipAt = -1.35 + (slice / 100) * 2.7;
    if (mode === "points") {
      const points = Array.from({ length: mesh.vertices.length / 3 }, (_, index) => index).sort(
        (a, b) => projected[a * 3 + 2] - projected[b * 3 + 2],
      );
      for (const index of points) {
        const offset = index * 3;
        const depth = projected[offset + 2];
        if (slice < 100 && depth > clipAt) continue;
        const light = Math.max(0, Math.min(1, (depth + 1.3) / 2.6));
        context.fillStyle = `rgba(43,228,255,${0.22 + light * 0.7})`;
        context.beginPath();
        context.arc(projected[offset], projected[offset + 1], interactive ? 1.45 : 1.05, 0, Math.PI * 2);
        context.fill();
      }
      return;
    }

    const triangles: { a: number; b: number; c: number; depth: number; light: number }[] = [];
    for (let index = 0; index < mesh.indices.length; index += 3) {
      const a = mesh.indices[index] * 3;
      const b = mesh.indices[index + 1] * 3;
      const c = mesh.indices[index + 2] * 3;
      const depth = (projected[a + 2] + projected[b + 2] + projected[c + 2]) / 3;
      if (slice < 100 && depth > clipAt) continue;
      const ux = projected[b] - projected[a];
      const uy = projected[b + 1] - projected[a + 1];
      const vx = projected[c] - projected[a];
      const vy = projected[c + 1] - projected[a + 1];
      const facing = ux * vy - uy * vx;
      const depthLight = Math.max(0, Math.min(1, (depth + 1.25) / 2.5));
      const light = Math.max(0.14, Math.min(1, 0.3 + depthLight * 0.5 + Math.min(Math.abs(facing) / 140, 0.2)));
      triangles.push({ a, b, c, depth, light });
    }
    triangles.sort((a, b) => a.depth - b.depth);

    if (mode === "wireframe") {
      context.strokeStyle = "rgba(66, 220, 241, .42)";
      context.lineWidth = 0.65;
      context.beginPath();
      for (const triangle of triangles) {
        context.moveTo(projected[triangle.a], projected[triangle.a + 1]);
        context.lineTo(projected[triangle.b], projected[triangle.b + 1]);
        context.lineTo(projected[triangle.c], projected[triangle.c + 1]);
        context.closePath();
      }
      context.stroke();
      return;
    }

    for (const triangle of triangles) {
      const value = Math.round(52 + triangle.light * 172);
      context.fillStyle = `rgb(${value},${Math.max(45, value - 7)},${Math.max(39, value - 15)})`;
      context.strokeStyle = context.fillStyle;
      context.lineWidth = 0.55;
      context.beginPath();
      context.moveTo(projected[triangle.a], projected[triangle.a + 1]);
      context.lineTo(projected[triangle.b], projected[triangle.b + 1]);
      context.lineTo(projected[triangle.c], projected[triangle.c + 1]);
      context.closePath();
      context.fill();
      context.stroke();
    }
  }, [interactive, mesh, mode, slice]);

  useEffect(() => {
    drawRef.current = paint;
    paint();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint]);

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    view.current.dragging = true;
    view.current.x = event.clientX;
    view.current.y = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const current = view.current;
    if (!interactive || !current.dragging) return;
    current.yaw += (event.clientX - current.x) * 0.008;
    current.pitch = Math.max(-1.3, Math.min(1.3, current.pitch + (event.clientY - current.y) * 0.006));
    current.x = event.clientX;
    current.y = event.clientY;
    drawRef.current();
  };
  const pointerUp = () => { view.current.dragging = false; };
  const wheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    event.preventDefault();
    view.current.zoom = Math.max(0.65, Math.min(1.65, view.current.zoom - event.deltaY * 0.001));
    drawRef.current();
  };
  const reset = () => {
    if (!interactive) return;
    view.current = { yaw: 0.6, pitch: -0.28, zoom: 1, dragging: false, x: 0, y: 0 };
    drawRef.current();
  };

  return (
    <div className={`mesh-frame ${className} ${interactive ? "interactive" : ""}`}>
      <canvas ref={canvasRef} aria-label={`${particle.id} 的真实 STL 网格预览`} tabIndex={interactive ? 0 : -1} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheel} onDoubleClick={reset} />
      {!mesh && !error && <span className="mesh-status">正在读取 STL 预览…</span>}
      {error && <span className="mesh-status error">{error}</span>}
    </div>
  );
}

const navItems: { key: PageKey; label: string }[] = [
  { key: "browse", label: "数据浏览" }, { key: "model", label: "三维模型" }, { key: "classify", label: "分类索引" }, { key: "stats", label: "数据概览" }, { key: "about", label: "关于项目" },
];

function Header({ active, onNavigate }: { active: PageKey; onNavigate: (key: PageKey) => void }) {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><button className="brand" onClick={() => onNavigate("home")} aria-label="返回首页"><span className="brand-en">LUPA Atlas</span><span className="brand-rule" /><span className="brand-cn">月壤颗粒形貌数据库</span></button><button className="menu-button" onClick={() => setOpen(!open)} aria-label="切换导航" aria-expanded={open}><span /><span /></button><nav className={open ? "nav open" : "nav"} aria-label="主导航">{navItems.map((item) => <button key={item.key} className={active === item.key ? "active" : ""} onClick={() => { onNavigate(item.key); setOpen(false); }}>{item.label}</button>)}</nav></header>;
}

function PageIntro({ index, eyebrow, title, copy }: { index: string; eyebrow: string; title: string; copy: string }) {
  return <div className="page-intro page-enter"><div><span className="folio-number">{index}</span><p className="eyebrow">{eyebrow}</p></div><h1>{title}</h1><p>{copy}</p></div>;
}

function HomePage({ onNavigate }: { onNavigate: (key: PageKey) => void }) {
  return <><section className="hero page-enter"><div className="hero-copy"><p className="eyebrow">LUNAR REGOLITH · STL DATASET</p><h1>查看月壤颗粒的<br />真实三维形貌</h1><p className="hero-lede">当前版本已接入 dataset 目录中的真实 STL 网格，可逐颗粒浏览、旋转和核对源文件。</p><div className="hero-actions"><button className="primary-button" onClick={() => onNavigate("browse")}>浏览真实数据 <span>→</span></button><button className="text-button" onClick={() => onNavigate("about")}>查看数据说明</button></div><div className="hero-metrics" aria-label="数据集概览"><div><strong>20</strong><span>STL 模型</span></div><div><strong>4</strong><span>文件类别</span></div><div><strong>100<sup>%</sup></strong><span>模型已接入</span></div></div></div><div className="hero-archive"><MeshCanvas particle={featured[0]} className="hero-model" /><div className="specimen-label label-1"><i /> {featured[0].id}</div><div className="specimen-label label-2">SOURCE · {featured[0].sourceFile}</div><div className="folio"><b>01</b><span>REAL MESH</span></div></div></section><section className="home-index"><p className="section-kicker">DATASET INDEX / 数据索引</p><div className="index-grid">{[["01", "数据浏览", "按真实文件编号和类别筛选 20 个 STL 模型。", "browse"], ["02", "三维模型", "旋转、缩放并切换网格、点云和线框视图。", "model"], ["03", "分类索引", "查看文件名前缀与四类颗粒的对应关系。", "classify"], ["04", "数据概览", "核对模型数量、文件构成与当前数据边界。", "stats"]].map(([number, title, copy, key]) => <button key={number} className="index-card" onClick={() => onNavigate(key as PageKey)}><span>{number}</span><h2>{title}</h2><p>{copy}</p><b>进入档案 →</b></button>)}</div></section></>;
}

function BrowsePage({ onSelect }: { onSelect: (particle: Particle) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"全部" | ParticleClass>("全部");
  const [sort, setSort] = useState("id");
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = particles.filter((particle) => (filter === "全部" || particle.className === filter) && (`${particle.id} ${particle.sourceFile}`).toLowerCase().includes(normalizedQuery));
    return [...result].sort((a, b) => sort === "class" ? a.className.localeCompare(b.className, "zh-CN") || a.id.localeCompare(b.id, undefined, { numeric: true }) : a.id.localeCompare(b.id, undefined, { numeric: true }));
  }, [filter, query, sort]);

  return <section className="content-page"><PageIntro index="01" eyebrow="STL CATALOGUE / 模型目录" title="真实颗粒数据浏览" copy="这里的每一条记录均对应 dataset 目录中的一个 STL 文件；页面不再使用演示编号或虚构形貌参数。" /><div className="catalog-toolbar"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入编号或文件名，例如 JJW-23" /></label><label className="select-box"><span>排序</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="id">文件编号</option><option value="class">颗粒类别</option></select></label></div><div className="filter-row" role="group" aria-label="颗粒类别筛选">{(["全部", ...labels] as const).map((name) => <button key={name} className={filter === name ? "active" : ""} onClick={() => setFilter(name)}>{name}<span>{name === "全部" ? particles.length : classCount(name)}</span></button>)}<p>显示 {filtered.length} / {particles.length} 个真实模型</p></div><div className="specimen-grid">{filtered.map((particle, index) => <article className="specimen-card" key={particle.id} onClick={() => onSelect(particle)} tabIndex={0} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onSelect(particle)}><div className="card-index">{String(index + 1).padStart(2, "0")}</div><MeshCanvas particle={particle} className="catalog-model" /><div className="card-title"><div><span>{particle.prefix}</span><h2>{particle.id}</h2></div><b>{particle.className}</b></div><dl className="source-meta"><div><dt>源文件</dt><dd title={particle.sourceFile}>{particle.sourceFile}</dd></div><div><dt>格式</dt><dd>ASCII STL</dd></div></dl><button className="card-link" onClick={(event) => { event.stopPropagation(); onSelect(particle); }}>打开真实网格 <span>↗</span></button></article>)}</div>{filtered.length === 0 && <p className="empty-state">未找到匹配的 STL 模型。</p>}</section>;
}

function ModelPage({ particle, setParticle }: { particle: Particle; setParticle: (particle: Particle) => void }) {
  const [mode, setMode] = useState<ViewMode>("surface");
  const [slice, setSlice] = useState(100);
  return <section className="content-page"><PageIntro index="02" eyebrow="REAL STL VIEWER / 真实网格" title="三维模型检视" copy="当前视图直接使用对应 STL 生成的轻量网格；拖拽旋转、滚轮缩放，双击可复位视角。" /><div className="model-layout page-enter"><div className="model-viewer"><div className="viewer-topbar"><div><span className="live-dot" /> DATASET MODEL <b>{particle.id}</b></div><div className="mode-switch" role="group" aria-label="显示模式">{([["surface", "表面"], ["points", "点云"], ["wireframe", "线框"]] as const).map(([key, label]) => <button key={key} className={mode === key ? "active" : ""} onClick={() => setMode(key)}>{label}</button>)}</div></div><MeshCanvas particle={particle} mode={mode} slice={slice} interactive className="viewer-model" /><div className="viewer-readout left"><span>SOURCE</span><br />{particle.sourceFile}</div><div className="viewer-readout right">ASCII STL<br />SURFACE MESH<br />OPTIMIZED WEB PREVIEW</div><div className="viewer-help"><span>拖拽旋转</span><span>滚轮缩放</span><span>双击复位</span></div></div><aside className="model-panel"><div className="specimen-heading"><span>{particle.prefix}</span><h2>{particle.id}</h2><b>{particle.className}</b></div><p className="panel-description">该视图来自 <strong>{particle.sourceFile}</strong>。网页仅对网格进行轻量化和显示归一化，dataset 中的源 STL 未被修改。</p><div className="provenance-list"><div><span>数据来源</span><strong>dataset/</strong></div><div><span>文件格式</span><strong>ASCII STL</strong></div><div><span>类别依据</span><strong>{particle.prefix} 文件前缀</strong></div><div><span>形貌参数</span><strong>暂未提供</strong></div></div><label className="slice-control"><span>表面裁切范围 <b>{slice}%</b></span><input type="range" min="25" max="100" value={slice} onChange={(event) => setSlice(Number(event.target.value))} /></label><label className="model-select"><span>切换真实模型</span><select value={particle.id} onChange={(event) => setParticle(particles.find((item) => item.id === event.target.value) ?? particle)}>{labels.map((label) => <optgroup key={label} label={`${label} · ${classMeta[label].code}`}>{particles.filter((item) => item.className === label).map((item) => <option value={item.id} key={item.id}>{item.id}</option>)}</optgroup>)}</select></label></aside></div></section>;
}

function ClassIndexPage({ onSelect }: { onSelect: (particle: Particle) => void }) {
  return <section className="content-page"><PageIntro index="03" eyebrow="DATASET CLASS INDEX / 类别索引" title="文件分类索引" copy="当前类别完全来自 STL 文件名前缀，不展示未经真实标签或模型结果支持的预测置信度与混淆矩阵。" /><div className="class-index-grid page-enter">{labels.map((label, index) => { const items = particles.filter((particle) => particle.className === label); return <article className="class-index-card" key={label}><div className="class-index-title"><span>{String(index + 1).padStart(2, "0")}</span><div><p>{classMeta[label].code}</p><h2>{label}</h2></div><strong>{items.length} 个模型</strong></div><div className="class-file-list">{items.map((particle) => <button key={particle.id} onClick={() => onSelect(particle)}><span>{particle.id}</span><small>{particle.sourceFile}</small><b>查看 ↗</b></button>)}</div></article>; })}</div><p className="data-note"><b>说明：</b>JJW、BLZ、YX、DKW 分别按现有命名映射为胶结物、玻璃珠、岩屑和单矿物。这里呈现的是数据集索引，不是自动分类实验结果。</p></section>;
}

function StatsPage() {
  return <section className="content-page"><PageIntro index="04" eyebrow="DATASET OVERVIEW / 数据概览" title="真实数据集构成" copy="仅统计当前 dataset 目录可以直接核对的文件数量与类别构成；形貌参数统计将在获得权威参数表后补充。" /><div className="overview-metrics page-enter"><article><span>01</span><strong>{particles.length}</strong><p>STL 文件</p></article><article><span>02</span><strong>{labels.length}</strong><p>文件类别</p></article><article><span>03</span><strong>{particles.filter((particle) => particle.sourceFile.includes("filter_5")).length}</strong><p>filter_5 文件</p></article><article><span>04</span><strong>{particles.filter((particle) => !particle.sourceFile.includes("filter_5")).length}</strong><p>repair 文件</p></article></div><div className="overview-grid"><article className="distribution-card"><div className="block-title"><span>A</span><div><p>CLASS DISTRIBUTION</p><h2>文件类别构成</h2></div></div><div className="donut-wrap"><div className="donut"><span><strong>{particles.length}</strong>真实模型</span></div><div className="donut-legend">{labels.map((label) => <div key={label}><i style={{ background: classMeta[label].color }} /><span>{label}</span><strong>{classCount(label)}</strong><small>{(classCount(label) / particles.length * 100).toFixed(0)}%</small></div>)}</div></div></article><article className="inventory-card"><div className="block-title"><span>B</span><div><p>FILE INVENTORY</p><h2>源文件清单</h2></div></div><div className="inventory-table">{labels.map((label) => <div key={label}><span>{classMeta[label].code}</span><strong>{label}</strong><p>{particles.filter((particle) => particle.className === label).map((particle) => particle.id).join(" · ")}</p><b>{classCount(label)}</b></div>)}</div></article></div><p className="data-note"><b>当前边界：</b>STL 格式不携带可靠的物理单位和实验参数。按照你的要求，本版暂不从网格推算尺寸、球形度、粗糙度或其他形貌指标。</p></section>;
}

function AboutPage() {
  return <section className="content-page about-page"><PageIntro index="05" eyebrow="DATA PROVENANCE / 数据说明" title="从源 STL 到网页预览" copy="本版以 dataset 目录中的 20 个 STL 文件为唯一颗粒数据来源，移除了此前用于界面演示的虚构单颗粒记录。" /><div className="method-flow page-enter">{[["01", "源文件归档", "保留 dataset 中的 ASCII STL 文件及原始命名，不改写源模型。"], ["02", "网页轻量化", "从每个源 STL 生成保持实际表面形貌的轻量预览网格，以控制静态站点加载量。"], ["03", "真实模型浏览", "浏览卡片与三维查看器均读取对应的真实网格预览，不再程序化生成近似颗粒。"], ["04", "参数待补充", "当前不推算尺寸和形貌参数；后续可接入权威 CSV 或实验元数据。"]].map(([number, title, copy]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{copy}</p></article>)}</div><div className="about-columns"><article><p className="section-kicker">SOURCE OF TRUTH</p><h2>文件即当前数据依据</h2><p>每个网页编号都可追溯到一个明确的 STL 文件。用于网页显示的模型只做三角网格简化和居中归一化，不用于替代源数据或开展定量测量。</p></article><article><p className="section-kicker">DATA NOTE</p><h2>不再混用演示结果</h2><p>旧版的 351 枚颗粒、形貌参数、分类准确率和统计图均没有当前 dataset 的数据支撑，已从界面移除。待提供真实参数表或分类输出后，可继续恢复相应分析模块。</p></article></div></section>;
}

export default function Home() {
  const [page, setPage] = useState<PageKey>("home");
  const [selected, setSelected] = useState(featured[0]);
  const navigate = (key: PageKey) => { setPage(key); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openParticle = (particle: Particle) => { setSelected(particle); navigate("model"); };
  return <main><Header active={page} onNavigate={navigate} />{page === "home" && <HomePage onNavigate={navigate} />}{page === "browse" && <BrowsePage onSelect={openParticle} />}{page === "model" && <ModelPage particle={selected} setParticle={setSelected} />}{page === "classify" && <ClassIndexPage onSelect={openParticle} />}{page === "stats" && <StatsPage />}{page === "about" && <AboutPage />}<footer><div><span className="brand-en">LUPA Atlas</span><p>月壤颗粒形貌数据库 · 真实 STL 数据浏览版</p></div><p>LUNAR REGOLITH<br />MORPHOLOGY ARCHIVE</p><span>© 2026</span></footer></main>;
}
