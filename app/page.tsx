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

type MeshData = { vertices: Float32Array; indices: Uint32Array; faceNormals: Float32Array };
const meshCache = new Map<string, Promise<MeshData>>();

function prepareMesh(vertices: Float32Array, indices: Uint32Array): MeshData {
  const faceNormals = new Float32Array(indices.length);
  let signedVolume = 0;

  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index] * 3;
    const b = indices[index + 1] * 3;
    const c = indices[index + 2] * 3;
    const ax = vertices[a];
    const ay = vertices[a + 1];
    const az = vertices[a + 2];
    const bx = vertices[b];
    const by = vertices[b + 1];
    const bz = vertices[b + 2];
    const cx = vertices[c];
    const cy = vertices[c + 1];
    const cz = vertices[c + 2];
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    faceNormals[index] = nx / length;
    faceNormals[index + 1] = ny / length;
    faceNormals[index + 2] = nz / length;
    signedVolume += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }

  if (signedVolume < 0) {
    for (let index = 0; index < faceNormals.length; index += 1) faceNormals[index] *= -1;
  }
  return { vertices, indices, faceNormals };
}

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
    return prepareMesh(
      new Float32Array(buffer.slice(8, vertexEnd)),
      new Uint32Array(buffer.slice(vertexEnd)),
    );
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
  autoRotate = false,
  className = "",
}: {
  particle: Particle;
  mode?: ViewMode;
  slice?: number;
  interactive?: boolean;
  autoRotate?: boolean;
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
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

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
      minX = Math.min(minX, projected[index]);
      maxX = Math.max(maxX, projected[index]);
      maxY = Math.max(maxY, projected[index + 1]);
    }

    const shadowWidth = Math.max(24, (maxX - minX) * 0.7);
    const shadowHeight = Math.max(5, shadowWidth * 0.085);
    const shadowY = Math.min(height - shadowHeight, maxY + shadowHeight * 0.5);
    context.save();
    context.translate((minX + maxX) / 2, shadowY);
    context.scale(shadowWidth, shadowHeight);
    const shadow = context.createRadialGradient(0, 0, 0, 0, 0, 0.5);
    shadow.addColorStop(0, interactive ? "rgba(0, 0, 0, .3)" : "rgba(52, 43, 34, .2)");
    shadow.addColorStop(0.58, interactive ? "rgba(0, 0, 0, .13)" : "rgba(52, 43, 34, .08)");
    shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = shadow;
    context.beginPath();
    context.arc(0, 0, 0.5, 0, Math.PI * 2);
    context.fill();
    context.restore();

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
        context.fillStyle = `rgba(${Math.round(54 + light * 45)},${Math.round(155 + light * 73)},${Math.round(179 + light * 76)},${0.2 + light * 0.76})`;
        context.beginPath();
        context.arc(projected[offset], projected[offset + 1], (interactive ? 1.15 : 0.9) + light * 0.7, 0, Math.PI * 2);
        context.fill();
      }
      return;
    }

    const triangles: { a: number; b: number; c: number; depth: number; shade: number; specular: number; rim: number; grain: number }[] = [];
    for (let index = 0; index < mesh.indices.length; index += 3) {
      const a = mesh.indices[index] * 3;
      const b = mesh.indices[index + 1] * 3;
      const c = mesh.indices[index + 2] * 3;
      const depth = (projected[a + 2] + projected[b + 2] + projected[c + 2]) / 3;
      if (slice < 100 && depth > clipAt) continue;

      const nx = mesh.faceNormals[index];
      const ny = mesh.faceNormals[index + 1];
      const nz = mesh.faceNormals[index + 2];
      const rotatedNX = nx * cosY - nz * sinY;
      const rotatedNZ = nx * sinY + nz * cosY;
      const rotatedNY = ny * cosP - rotatedNZ * sinP;
      const normalZ = ny * sinP + rotatedNZ * cosP;
      if (mode === "surface" && normalZ < -0.025) continue;

      const diffuse = Math.max(0, rotatedNX * -0.46 + rotatedNY * 0.62 + normalZ * 0.64);
      const halfLight = Math.max(0, rotatedNX * -0.25 + rotatedNY * 0.34 + normalZ * 0.91);
      const specular = Math.pow(halfLight, 22);
      const rim = Math.pow(1 - Math.max(0, normalZ), 2.2);
      const depthLight = Math.max(0, Math.min(1, (depth + 1.25) / 2.5));
      const shade = Math.min(1.15, 0.28 + diffuse * 0.68 + depthLight * 0.1);
      const grain = 0.94 + ((index / 3) % 7) * 0.012;
      triangles.push({ a, b, c, depth, shade, specular, rim, grain });
    }
    triangles.sort((a, b) => a.depth - b.depth);

    if (mode === "wireframe") {
      for (let layer = 0; layer < 3; layer += 1) {
        context.strokeStyle = `rgba(${65 + layer * 15},${165 + layer * 28},${190 + layer * 28},${0.14 + layer * 0.18})`;
        context.lineWidth = 0.5 + layer * 0.18;
        context.beginPath();
        for (const triangle of triangles) {
          const depthLayer = Math.max(0, Math.min(2, Math.floor(((triangle.depth + 1.3) / 2.6) * 3)));
          if (depthLayer !== layer) continue;
          context.moveTo(projected[triangle.a], projected[triangle.a + 1]);
          context.lineTo(projected[triangle.b], projected[triangle.b + 1]);
          context.lineTo(projected[triangle.c], projected[triangle.c + 1]);
          context.closePath();
        }
        context.stroke();
      }
      return;
    }

    for (const triangle of triangles) {
      const base = interactive ? [112, 125, 134] : [157, 151, 140];
      const highlight = triangle.specular * (interactive ? 105 : 82);
      const rimLight = triangle.rim * (interactive ? 26 : 13);
      const red = Math.min(255, base[0] * triangle.shade * triangle.grain + highlight + rimLight * 0.25);
      const green = Math.min(255, base[1] * triangle.shade * triangle.grain + highlight + rimLight * 0.72);
      const blue = Math.min(255, base[2] * triangle.shade * triangle.grain + highlight + rimLight);
      context.fillStyle = `rgb(${Math.round(red)},${Math.round(green)},${Math.round(blue)})`;
      context.strokeStyle = context.fillStyle;
      context.lineWidth = 0.7;
      context.beginPath();
      context.moveTo(projected[triangle.a], projected[triangle.a + 1]);
      context.lineTo(projected[triangle.b], projected[triangle.b + 1]);
      context.lineTo(projected[triangle.c], projected[triangle.c + 1]);
      context.closePath();
      context.fill();
      context.stroke();
    }

    context.strokeStyle = interactive ? "rgba(111, 206, 218, .11)" : "rgba(49, 42, 35, .11)";
    context.lineWidth = interactive ? 0.48 : 0.4;
    context.beginPath();
    const textureStep = interactive ? 2 : 3;
    for (let index = 0; index < triangles.length; index += textureStep) {
      const triangle = triangles[index];
      context.moveTo(projected[triangle.a], projected[triangle.a + 1]);
      context.lineTo(projected[triangle.b], projected[triangle.b + 1]);
      context.lineTo(projected[triangle.c], projected[triangle.c + 1]);
    }
    context.stroke();
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

  useEffect(() => {
    if (!autoRotate || !mesh || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let previous = performance.now();
    const animate = (time: number) => {
      const elapsed = time - previous;
      if (elapsed >= 40) {
        view.current.yaw += elapsed * 0.00006;
        previous = time;
        paint();
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [autoRotate, mesh, paint]);

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
  const [heroParticle, setHeroParticle] = useState(featured[0]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setHeroParticle(particles[Math.floor(Math.random() * particles.length)]);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return <><section className="hero page-enter"><div className="hero-copy"><p className="eyebrow">LUNAR REGOLITH · STL DATASET</p><h1>查看月壤颗粒的<br />真实三维形貌</h1><div className="hero-actions"><button className="primary-button" onClick={() => onNavigate("browse")}>浏览颗粒数据 <span>→</span></button><button className="text-button" onClick={() => onNavigate("about")}>关于项目</button></div><div className="hero-metrics" aria-label="数据集概览"><div><strong>20</strong><span>STL 模型</span></div><div><strong>4</strong><span>颗粒类别</span></div><div><strong>3</strong><span>显示模式</span></div></div></div><div className="hero-archive"><MeshCanvas particle={heroParticle} autoRotate className="hero-model" /><div className="specimen-label label-1"><i /> {heroParticle.id}</div><div className="specimen-label label-2">SPECIMEN · {heroParticle.sourceFile}</div><div className="folio"><b>01</b><span>PARTICLE</span></div></div></section><section className="home-index"><p className="section-kicker">DATASET INDEX / 数据索引</p><div className="index-grid">{[["01", "数据浏览", "按编号与类别浏览颗粒模型。", "browse"], ["02", "三维模型", "旋转、缩放并观察颗粒表面。", "model"], ["03", "分类索引", "浏览四类颗粒的样本构成。", "classify"], ["04", "数据概览", "查看颗粒数量与类别分布。", "stats"]].map(([number, title, copy, key]) => <button key={number} className="index-card" onClick={() => onNavigate(key as PageKey)}><span>{number}</span><h2>{title}</h2><p>{copy}</p><b>进入档案 →</b></button>)}</div></section></>;
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

  return <section className="content-page"><PageIntro index="01" eyebrow="STL CATALOGUE / 模型目录" title="颗粒数据浏览" copy="按类别与编号检索颗粒形貌。" /><div className="catalog-toolbar"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入编号或文件名，例如 JJW-23" /></label><label className="select-box"><span>排序</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="id">文件编号</option><option value="class">颗粒类别</option></select></label></div><div className="filter-row" role="group" aria-label="颗粒类别筛选">{(["全部", ...labels] as const).map((name) => <button key={name} className={filter === name ? "active" : ""} onClick={() => setFilter(name)}>{name}<span>{name === "全部" ? particles.length : classCount(name)}</span></button>)}<p>显示 {filtered.length} / {particles.length} 个模型</p></div><div className="specimen-grid">{filtered.map((particle, index) => <article className="specimen-card" key={particle.id} onClick={() => onSelect(particle)} tabIndex={0} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onSelect(particle)}><div className="card-index">{String(index + 1).padStart(2, "0")}</div><MeshCanvas particle={particle} className="catalog-model" /><div className="card-title"><div><span>{particle.prefix}</span><h2>{particle.id}</h2></div><b>{particle.className}</b></div><dl className="source-meta"><div><dt>源文件</dt><dd title={particle.sourceFile}>{particle.sourceFile}</dd></div><div><dt>格式</dt><dd>ASCII STL</dd></div></dl><button className="card-link" onClick={(event) => { event.stopPropagation(); onSelect(particle); }}>查看三维模型 <span>↗</span></button></article>)}</div>{filtered.length === 0 && <p className="empty-state">未找到匹配的 STL 模型。</p>}</section>;
}

function ModelPage({ particle, setParticle }: { particle: Particle; setParticle: (particle: Particle) => void }) {
  const [mode, setMode] = useState<ViewMode>("surface");
  const [slice, setSlice] = useState(100);
  return <section className="content-page"><PageIntro index="02" eyebrow="3D PARTICLE VIEWER / 三维颗粒" title="三维模型检视" copy="从不同视角观察颗粒表面结构。" /><div className="model-layout page-enter"><div className="model-viewer"><div className="viewer-topbar"><div><span className="live-dot" /> PARTICLE MODEL <b>{particle.id}</b></div><div className="mode-switch" role="group" aria-label="显示模式">{([["surface", "表面"], ["points", "点云"], ["wireframe", "线框"]] as const).map(([key, label]) => <button key={key} className={mode === key ? "active" : ""} onClick={() => setMode(key)}>{label}</button>)}</div></div><MeshCanvas particle={particle} mode={mode} slice={slice} interactive className="viewer-model" /><div className="viewer-readout left"><span>SPECIMEN</span><br />{particle.sourceFile}</div><div className="viewer-readout right">ASCII STL<br />SHADED SURFACE<br />DYNAMIC LIGHTING</div><div className="viewer-help"><span>拖拽旋转</span><span>滚轮缩放</span><span>双击复位</span></div></div><aside className="model-panel"><div className="specimen-heading"><span>{particle.prefix}</span><h2>{particle.id}</h2><b>{particle.className}</b></div><div className="provenance-list"><div><span>颗粒编号</span><strong>{particle.id}</strong></div><div><span>颗粒类别</span><strong>{particle.className}</strong></div><div><span>模型格式</span><strong>ASCII STL</strong></div></div><label className="slice-control"><span>表面裁切范围 <b>{slice}%</b></span><input type="range" min="25" max="100" value={slice} onChange={(event) => setSlice(Number(event.target.value))} /></label><label className="model-select"><span>切换颗粒模型</span><select value={particle.id} onChange={(event) => setParticle(particles.find((item) => item.id === event.target.value) ?? particle)}>{labels.map((label) => <optgroup key={label} label={`${label} · ${classMeta[label].code}`}>{particles.filter((item) => item.className === label).map((item) => <option value={item.id} key={item.id}>{item.id}</option>)}</optgroup>)}</select></label></aside></div></section>;
}

function ClassIndexPage({ onSelect }: { onSelect: (particle: Particle) => void }) {
  return <section className="content-page"><PageIntro index="03" eyebrow="PARTICLE CLASS INDEX / 类别索引" title="颗粒分类索引" copy="四类月壤颗粒的形貌样本索引。" /><div className="class-index-grid page-enter">{labels.map((label, index) => { const items = particles.filter((particle) => particle.className === label); return <article className="class-index-card" key={label}><div className="class-index-title"><span>{String(index + 1).padStart(2, "0")}</span><div><p>{classMeta[label].code}</p><h2>{label}</h2></div><strong>{items.length} 个模型</strong></div><div className="class-file-list">{items.map((particle) => <button key={particle.id} onClick={() => onSelect(particle)}><span>{particle.id}</span><small>{particle.sourceFile}</small><b>查看 ↗</b></button>)}</div></article>; })}</div></section>;
}

function StatsPage() {
  return <section className="content-page"><PageIntro index="04" eyebrow="PARTICLE OVERVIEW / 数据概览" title="颗粒样本构成" copy="颗粒样本的类别构成与模型清单。" /><div className="overview-metrics page-enter"><article><span>01</span><strong>{particles.length}</strong><p>STL 模型</p></article><article><span>02</span><strong>{labels.length}</strong><p>颗粒类别</p></article><article><span>03</span><strong>{particles.filter((particle) => particle.sourceFile.includes("filter_5")).length}</strong><p>筛选模型</p></article><article><span>04</span><strong>{particles.filter((particle) => !particle.sourceFile.includes("filter_5")).length}</strong><p>修复模型</p></article></div><div className="overview-grid"><article className="distribution-card"><div className="block-title"><span>A</span><div><p>CLASS DISTRIBUTION</p><h2>颗粒类别构成</h2></div></div><div className="donut-wrap"><div className="donut"><span><strong>{particles.length}</strong>颗粒模型</span></div><div className="donut-legend">{labels.map((label) => <div key={label}><i style={{ background: classMeta[label].color }} /><span>{label}</span><strong>{classCount(label)}</strong><small>{(classCount(label) / particles.length * 100).toFixed(0)}%</small></div>)}</div></div></article><article className="inventory-card"><div className="block-title"><span>B</span><div><p>SPECIMEN INDEX</p><h2>颗粒模型清单</h2></div></div><div className="inventory-table">{labels.map((label) => <div key={label}><span>{classMeta[label].code}</span><strong>{label}</strong><p>{particles.filter((particle) => particle.className === label).map((particle) => particle.id).join(" · ")}</p><b>{classCount(label)}</b></div>)}</div></article></div></section>;
}

function AboutPage() {
  return <section className="content-page about-page"><PageIntro index="05" eyebrow="LUNAR PARTICLE ATLAS / 项目简介" title="月壤颗粒三维形貌图谱" copy="以数字模型呈现不同类别月壤颗粒的表面结构与形貌差异。" /><div className="method-flow page-enter">{[["01", "颗粒浏览", "按编号和类别检索月壤颗粒。"], ["02", "三维观察", "通过旋转和缩放观察颗粒表面。"], ["03", "多模式显示", "在表面、点云和线框视图之间切换。"], ["04", "样本对比", "比较不同颗粒的整体轮廓与局部结构。"]].map(([number, title, copy]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{copy}</p></article>)}</div><div className="about-columns"><article><p className="section-kicker">MORPHOLOGY</p><h2>观察颗粒的三维形貌</h2><p>不同成因与演化过程会在颗粒轮廓、棱角和表面起伏中留下形貌特征。三维模型提供了更完整的空间观察视角。</p></article><article><p className="section-kicker">SPECIMEN COLLECTION</p><h2>四类颗粒样本</h2><p>图谱收录胶结物、玻璃珠、岩屑和单矿物四类颗粒，可通过编号索引快速切换和对照观察。</p></article></div></section>;
}

export default function Home() {
  const [page, setPage] = useState<PageKey>("home");
  const [selected, setSelected] = useState(featured[0]);
  const navigate = (key: PageKey) => { setPage(key); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openParticle = (particle: Particle) => { setSelected(particle); navigate("model"); };
  return <main><Header active={page} onNavigate={navigate} />{page === "home" && <HomePage onNavigate={navigate} />}{page === "browse" && <BrowsePage onSelect={openParticle} />}{page === "model" && <ModelPage particle={selected} setParticle={setSelected} />}{page === "classify" && <ClassIndexPage onSelect={openParticle} />}{page === "stats" && <StatsPage />}{page === "about" && <AboutPage />}<footer><div><span className="brand-en">LUPA Atlas</span><p>月壤颗粒三维形貌图谱</p></div><p>LUNAR REGOLITH<br />MORPHOLOGY ARCHIVE</p><span>© 2026</span></footer></main>;
}
