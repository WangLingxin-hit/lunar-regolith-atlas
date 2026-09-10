"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { LanguageContext, useLanguage, type Language, type TextKey } from "./i18n";

type PageKey = "home" | "browse" | "model" | "classify" | "about" | "application";
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

class MeshLoadError extends Error {
  constructor(readonly key: TextKey, readonly status?: number) {
    super(key);
  }
}

function loadMesh(path: string): Promise<MeshData> {
  const url = `${assetBase}${path}`;
  const cached = meshCache.get(url);
  if (cached) return cached;

  const request = fetch(url).then(async (response) => {
    if (!response.ok) throw new MeshLoadError("无法读取模型 ({status})", response.status);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 8) throw new MeshLoadError("模型预览文件不完整");
    const header = new DataView(buffer, 0, 8);
    const vertexCount = header.getUint32(0, true);
    const indexCount = header.getUint32(4, true);
    const vertexEnd = 8 + vertexCount * 3 * 4;
    const expectedLength = vertexEnd + indexCount * 4;
    if (expectedLength !== buffer.byteLength) throw new MeshLoadError("模型预览文件格式错误");
    return prepareMesh(
      new Float32Array(buffer.slice(8, vertexEnd)),
      new Uint32Array(buffer.slice(vertexEnd)),
    );
  });
  meshCache.set(url, request);
  return request;
}

function useMesh(particle: Particle) {
  const [result, setResult] = useState<{ path: string; mesh?: MeshData; error?: MeshLoadError }>({ path: "" });

  useEffect(() => {
    let active = true;
    loadMesh(particle.meshFile)
      .then((mesh) => active && setResult({ path: particle.meshFile, mesh }))
      .catch((error: unknown) => active && setResult({ path: particle.meshFile, error: error instanceof MeshLoadError ? error : new MeshLoadError("模型加载失败") }));
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
  const { t } = useLanguage();
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
    current.yaw -= (event.clientX - current.x) * 0.008;
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
      <canvas ref={canvasRef} aria-label={t("{id} 的真实 STL 网格预览", { id: particle.id })} tabIndex={interactive ? 0 : -1} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheel} onDoubleClick={reset} />
      {!mesh && !error && <span className="mesh-status">{t("正在读取 STL 预览…")}</span>}
      {error && <span className="mesh-status error">{t(error.key, { status: error.status ?? "" })}</span>}
    </div>
  );
}

const navItems: { key: PageKey; label: TextKey }[] = [
  { key: "browse", label: "数据浏览" },
  { key: "model", label: "三维模型" },
  { key: "classify", label: "分类索引" },
  { key: "about", label: "关于项目" },
  { key: "application", label: "应用推广" },
];

function Header({ active, onNavigate, onLanguageChange }: {
  active: PageKey;
  onNavigate: (key: PageKey) => void;
  onLanguageChange: (language: Language) => void;
}) {
  const [open, setOpen] = useState(false);
  const { language, t } = useLanguage();
  return (
    <header className="site-header">
      <button className="brand" onClick={() => onNavigate("home")} aria-label={t("返回首页")}>
        <span className="brand-en">LUPA Atlas</span><span className="brand-rule" />
        <span className="brand-cn">{t("月壤颗粒形貌数据库")}</span>
      </button>
      <div className="header-controls">
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label={t("切换导航")} aria-expanded={open} aria-controls="main-navigation"><span /><span /></button>
        <nav id="main-navigation" className={open ? "nav open" : "nav"} aria-label={t("主导航")}>
          {navItems.map((item) => (
            <button key={item.key} className={active === item.key ? "active" : ""} aria-current={active === item.key ? "page" : undefined} onClick={() => { onNavigate(item.key); setOpen(false); }}>{t(item.label)}</button>
          ))}
        </nav>
        <div className="language-switch" role="group" aria-label={t("切换语言")}>
          <button lang="en" aria-label="English" aria-pressed={language === "en"} onClick={() => onLanguageChange("en")}>EN</button>
          <button lang="zh-CN" aria-label="中文" aria-pressed={language === "zh"} onClick={() => onLanguageChange("zh")}>中文</button>
        </div>
      </div>
    </header>
  );
}

function PageIntro({ index, eyebrow, title, copy }: { index: string; eyebrow: TextKey; title: TextKey; copy: TextKey }) {
  const { t } = useLanguage();
  return <div className="page-intro page-enter"><div><span className="folio-number">{index}</span><p className="eyebrow">{t(eyebrow)}</p></div><h1>{t(title)}</h1><p>{t(copy)}</p></div>;
}

const homeItems = [
  { key: "browse", title: "数据浏览", copy: "按编号与类别浏览颗粒模型。" },
  { key: "model", title: "三维模型", copy: "旋转、缩放并观察颗粒表面。" },
  { key: "classify", title: "分类索引", copy: "浏览四类颗粒的样本构成。" },
  { key: "application", title: "应用推广", copy: "探索真实颗粒形貌在月面作业与物性研究中的应用。" },
] as const;

function HomePage({ onNavigate }: { onNavigate: (key: PageKey) => void }) {
  const [heroParticle, setHeroParticle] = useState(featured[0]);
  const { t } = useLanguage();
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setHeroParticle(particles[Math.floor(Math.random() * particles.length)]);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return <>
    <section className="hero page-enter">
      <div className="hero-copy">
        <p className="eyebrow">{t("月壤 · STL 数据集")}</p>
        <h1>{t("月壤颗粒")}<br />{t("三维形貌数据库")}</h1>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => onNavigate("browse")}>{t("浏览颗粒数据")} <span>→</span></button>
          <button className="text-button" onClick={() => onNavigate("about")}>{t("关于项目")}</button>
        </div>
      </div>
      <div className="hero-archive">
        <MeshCanvas particle={heroParticle} autoRotate className="hero-model" />
        <div className="specimen-label label-1"><i /> {heroParticle.id}</div>
        <div className="specimen-label label-2">{t("样本")} · {heroParticle.sourceFile}</div>
        <div className="folio"><b>01</b><span>{t("颗粒")}</span></div>
      </div>
    </section>
    <section className="home-index">
      <p className="section-kicker">{t("DATASET INDEX / 数据索引")}</p>
      <div className="index-grid">
        {homeItems.map((item, index) => (
          <button key={item.key} className="index-card" onClick={() => onNavigate(item.key)}>
            <span>{String(index + 1).padStart(2, "0")}</span><h2>{t(item.title)}</h2><p>{t(item.copy)}</p><b>{t("进入档案")} →</b>
          </button>
        ))}
      </div>
    </section>
  </>;
}

function BrowsePage({ onSelect }: { onSelect: (particle: Particle) => void }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"全部" | ParticleClass>("全部");
  const [sort, setSort] = useState("id");
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = particles.filter((particle) => (filter === "全部" || particle.className === filter) && (`${particle.id} ${particle.sourceFile}`).toLowerCase().includes(normalizedQuery));
    return [...result].sort((a, b) => sort === "class" ? a.className.localeCompare(b.className, "zh-CN") || a.id.localeCompare(b.id, undefined, { numeric: true }) : a.id.localeCompare(b.id, undefined, { numeric: true }));
  }, [filter, query, sort]);

  return (
    <section className="content-page">
      <PageIntro index="01" eyebrow="STL CATALOGUE / 模型目录" title="颗粒数据浏览" copy="按类别与编号检索颗粒形貌。" />
      <div className="catalog-toolbar">
        <label className="search-box"><span>⌕</span><input aria-label={t("搜索颗粒")} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("输入编号或文件名，例如 JJW-23")} /></label>
        <label className="select-box"><span>{t("排序")}</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="id">{t("文件编号")}</option><option value="class">{t("颗粒类别")}</option></select></label>
      </div>
      <div className="filter-row" role="group" aria-label={t("颗粒类别筛选")}>
        {(["全部", ...labels] as const).map((name) => <button key={name} className={filter === name ? "active" : ""} onClick={() => setFilter(name)}>{t(name)}<span>{name === "全部" ? particles.length : classCount(name)}</span></button>)}
        <p aria-live="polite">{t("显示 {count} / {total} 个模型", { count: filtered.length, total: particles.length })}</p>
      </div>
      <div className="specimen-grid">
        {filtered.map((particle, index) => (
          <article className="specimen-card" key={particle.id} onClick={() => onSelect(particle)} tabIndex={0} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(particle); } }}>
            <div className="card-index">{String(index + 1).padStart(2, "0")}</div>
            <MeshCanvas particle={particle} className="catalog-model" />
            <div className="card-title"><div><span>{particle.prefix}</span><h2>{particle.id}</h2></div><b>{t(particle.className)}</b></div>
            <dl className="source-meta"><div><dt>{t("源文件")}</dt><dd title={particle.sourceFile}>{particle.sourceFile}</dd></div><div><dt>{t("格式")}</dt><dd>ASCII STL</dd></div></dl>
            <button className="card-link" onClick={(event) => { event.stopPropagation(); onSelect(particle); }}>{t("查看三维模型")} <span>↗</span></button>
          </article>
        ))}
      </div>
      {filtered.length === 0 && <p className="empty-state">{t("未找到匹配的 STL 模型。")}</p>}
    </section>
  );
}

function ModelPage({ particle, setParticle }: { particle: Particle; setParticle: (particle: Particle) => void }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<ViewMode>("surface");
  const [slice, setSlice] = useState(100);
  const modes = [["surface", "表面"], ["points", "点云"], ["wireframe", "线框"]] as const;
  return (
    <section className="content-page">
      <PageIntro index="02" eyebrow="3D PARTICLE VIEWER / 三维颗粒" title="三维模型检视" copy="从不同视角观察颗粒表面结构。" />
      <div className="model-layout page-enter">
        <div className="model-viewer">
          <div className="viewer-topbar">
            <div><span className="live-dot" /> {t("颗粒模型")} <b>{particle.id}</b></div>
            <div className="mode-switch" role="group" aria-label={t("显示模式")}>
              {modes.map(([key, label]) => <button key={key} className={mode === key ? "active" : ""} aria-pressed={mode === key} onClick={() => setMode(key)}>{t(label)}</button>)}
            </div>
          </div>
          <MeshCanvas particle={particle} mode={mode} slice={slice} interactive className="viewer-model" />
          <div className="viewer-readout left"><span>{t("样本")}</span><br />{particle.sourceFile}</div>
          <div className="viewer-readout right">ASCII STL<br />{t(modes.find(([key]) => key === mode)![1])}<br />{t("动态光照")}</div>
          <div className="viewer-help"><span>{t("拖拽旋转")}</span><span>{t("滚轮缩放")}</span><span>{t("双击复位")}</span></div>
        </div>
        <aside className="model-panel">
          <div className="specimen-heading"><span>{particle.prefix}</span><h2>{particle.id}</h2><b>{t(particle.className)}</b></div>
          <div className="provenance-list">
            <div><span>{t("颗粒编号")}</span><strong>{particle.id}</strong></div>
            <div><span>{t("颗粒类别")}</span><strong>{t(particle.className)}</strong></div>
            <div><span>{t("模型格式")}</span><strong>ASCII STL</strong></div>
          </div>
          <label className="slice-control"><span>{t("表面裁切范围")} <b>{slice}%</b></span><input type="range" min="25" max="100" value={slice} onChange={(event) => setSlice(Number(event.target.value))} /></label>
          <label className="model-select"><span>{t("切换颗粒模型")}</span>
            <select value={particle.id} onChange={(event) => setParticle(particles.find((item) => item.id === event.target.value) ?? particle)}>
              {labels.map((label) => <optgroup key={label} label={`${t(label)} · ${classMeta[label].code}`}>{particles.filter((item) => item.className === label).map((item) => <option value={item.id} key={item.id}>{item.id}</option>)}</optgroup>)}
            </select>
          </label>
        </aside>
      </div>
    </section>
  );
}

function ClassIndexPage({ onSelect }: { onSelect: (particle: Particle) => void }) {
  const { t } = useLanguage();
  return (
    <section className="content-page">
      <PageIntro index="03" eyebrow="PARTICLE CLASS INDEX / 类别索引" title="颗粒分类索引" copy="四类月壤颗粒的形貌样本索引。" />
      <div className="class-index-grid page-enter">
        {labels.map((label, index) => {
          const items = particles.filter((particle) => particle.className === label);
          return <article className="class-index-card" key={label}>
            <div className="class-index-title"><span>{String(index + 1).padStart(2, "0")}</span><div><p>{classMeta[label].code}</p><h2>{t(label)}</h2></div><strong>{t("{count} 个模型", { count: items.length })}</strong></div>
            <div className="class-file-list">{items.map((particle) => <button key={particle.id} onClick={() => onSelect(particle)}><span>{particle.id}</span><small>{particle.sourceFile}</small><b>{t("查看")} ↗</b></button>)}</div>
          </article>;
        })}
      </div>
    </section>
  );
}

function AboutPage() {
  const { t } = useLanguage();
  return (
    <section className="content-page about-page">
      <PageIntro index="04" eyebrow="LUNAR PARTICLE ATLAS / 项目简介" title="月壤颗粒三维形貌图谱" copy="以数字模型呈现不同类别月壤颗粒的表面结构与形貌差异。" />
      <div className="method-flow page-enter">
        {([
          ["01", "颗粒浏览", "按编号和类别检索月壤颗粒。"],
          ["02", "三维观察", "通过旋转和缩放观察颗粒表面。"],
          ["03", "多模式显示", "在表面、点云和线框视图之间切换。"],
          ["04", "样本对比", "比较不同颗粒的整体轮廓与局部结构。"],
        ] as const).map(([number, title, copy]) => <article key={number}><span>{number}</span><h2>{t(title)}</h2><p>{t(copy)}</p></article>)}
      </div>
      <div className="about-columns">
        <article><p className="section-kicker">{t("形貌特征")}</p><h2>{t("观察颗粒的三维形貌")}</h2><p>{t("不同成因与演化过程会在颗粒轮廓、棱角和表面起伏中留下形貌特征。三维模型提供了更完整的空间观察视角。")}</p></article>
        <article><p className="section-kicker">{t("样本集合")}</p><h2>{t("四类颗粒样本")}</h2><p>{t("图谱收录胶结物、玻璃珠、岩屑和单矿物四类颗粒，可通过编号索引快速切换和对照观察。")}</p></article>
      </div>
    </section>
  );
}

const applications = [
  {
    id: "robotics", label: "月面机器人学", title: "支撑未来月面智能作业",
    copy: "将真实颗粒形貌及其物性推演引入 GPU 并行环境下的机器人学作业仿真，为月面挖掘等智能作业提供颗粒环境基础，支撑机器人与月壤相互作用的模拟及作业策略研究。",
    tags: ["GPU 并行仿真", "机器人作业", "颗粒物性"],
    kind: "video", file: "digger.mp4", caption: "月面挖掘机器人作业仿真演示",
  },
  {
    id: "drilling", label: "剖面探测", title: "支撑极区月壤剖面物性测试与仿真",
    copy: "面向极区月壤剖面物性测试，将真实月壤形貌纳入颗粒行为仿真，以更精准地描述钻进过程中的颗粒运动与排屑行为，支撑月背剖面钻进过程中延迟排屑等现象的复现与机理分析。",
    tags: ["剖面物性", "钻进仿真", "延迟排屑"],
    kind: "video", file: "drilling.mp4", caption: "月壤剖面钻进与颗粒排屑仿真演示",
  },
  {
    id: "contacts", label: "颗粒力学", title: "支撑月壤颗粒群物性推演与接触特性分析",
    copy: "考虑真实月壤颗粒的形貌特征，开展颗粒群接触特性与流动特性分析，关联细观接触行为与宏观物性响应，构建宏—细观映射关系，为颗粒群物性推演提供基础。",
    tags: ["接触特性", "颗粒流动", "宏—细观映射"],
    kind: "image", file: "free_fall.png", caption: "颗粒群运动与接触特性研究示意",
  },
  {
    id: "thermal", label: "热物性特征", title: "支撑月壤颗粒群热物性特征推演",
    copy: "以真实颗粒形貌为基础，研究颗粒群的传热行为，并推广至不同区位与深度条件下的月壤热导等热物性特征推演，为未来月球资源利用与开发提供物性依据。",
    tags: ["热物性", "区位与深度", "资源利用"],
    kind: "image", file: "heat_field.png", caption: "月壤颗粒群温度场与传热研究示意",
  },
  {
    id: "ice", label: "月壤水冰", title: "支撑永久阴影区月壤水冰覆膜特征构建及物性推演",
    copy: "面向月球永久阴影区，以真实月壤颗粒形貌为基础构建水冰覆膜特征，进一步研究覆膜条件下的颗粒物性，为含冰月壤的物性推演及后续资源利用研究提供支撑。",
    tags: ["永久阴影区", "水冰覆膜", "含冰月壤物性"],
    kind: "image", file: "水冰覆膜.png", caption: "月壤颗粒水冰覆膜特征示意",
  },
] as const;

function ApplicationPage() {
  const { t } = useLanguage();
  return (
    <section className="content-page application-page">
      <PageIntro index="05" eyebrow="FUTURE APPLICATIONS / 应用推广" title="从颗粒形貌走向月面应用" copy="基于已有研究，面向智能作业、剖面探测、颗粒力学、热物性与水冰覆膜，拓展真实月壤颗粒形貌数据的应用。" />
      <div className="application-list">
        {applications.map((item, index) => (
          <article className="application-card page-enter" key={item.id} aria-labelledby={`application-${item.id}`}>
            <div className="application-copy">
              <p className="section-kicker"><span>{String(index + 1).padStart(2, "0")}</span>{t(item.label)}</p>
              <h2 id={`application-${item.id}`}>{t(item.title)}</h2>
              <p className="application-description">{t(item.copy)}</p>
              <ul className="application-tags" aria-label={t("研究关键词")}>
                {item.tags.map((tag) => <li key={tag}>{t(tag)}</li>)}
              </ul>
            </div>
            <figure className="application-media">
              <div className="application-media-frame">
                {item.kind === "video" ? (
                  <video controls playsInline preload="metadata" aria-label={t(item.caption)}>
                    <source src={`${assetBase}/media/${encodeURIComponent(item.file)}`} type="video/mp4" />
                    {t("您的浏览器不支持视频播放。")}
                  </video>
                ) : (
                  <Image src={`${assetBase}/media/${encodeURIComponent(item.file)}`} alt={t(item.caption)} fill sizes="(max-width: 900px) 100vw, 55vw" style={{ objectFit: "contain" }} />
                )}
              </div>
              <figcaption><span>{t(item.caption)}</span><a href={`${assetBase}/media/${encodeURIComponent(item.file)}`} target="_blank" rel="noopener noreferrer">{t(item.kind === "video" ? "打开视频" : "查看原图")} ↗</a></figcaption>
            </figure>
          </article>
        ))}
      </div>
    </section>
  );
}

function Atlas({ onLanguageChange }: { onLanguageChange: (language: Language) => void }) {
  const { language, t } = useLanguage();
  const title = `LUPA Atlas｜${t("月壤颗粒形貌数据库")}`;
  const description = t("基于真实 STL 数据的月壤颗粒三维形貌浏览与数据索引平台。");
  const [page, setPage] = useState<PageKey>("home");
  const [selected, setSelected] = useState(featured[0]);

  useEffect(() => {
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  }, [language, title, description]);

  const navigate = (key: PageKey) => { setPage(key); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openParticle = (particle: Particle) => { setSelected(particle); navigate("model"); };
  return (
    <main>
      <Header active={page} onNavigate={navigate} onLanguageChange={onLanguageChange} />
      {page === "home" && <HomePage onNavigate={navigate} />}
      {page === "browse" && <BrowsePage onSelect={openParticle} />}
      {page === "model" && <ModelPage particle={selected} setParticle={setSelected} />}
      {page === "classify" && <ClassIndexPage onSelect={openParticle} />}
      {page === "about" && <AboutPage />}
      {page === "application" && <ApplicationPage />}
      <footer>
        <div><span className="brand-en">LUPA Atlas</span><p>{t("月壤颗粒三维形貌图谱")}</p></div>
        <p>{t("月壤形貌档案")}</p><span>© 2026</span>
      </footer>
    </main>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  return <LanguageContext.Provider value={language}><Atlas onLanguageChange={setLanguage} /></LanguageContext.Provider>;
}
