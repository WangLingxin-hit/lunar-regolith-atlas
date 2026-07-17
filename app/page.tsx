"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

type PageKey = "home" | "browse" | "model" | "classify" | "stats" | "about";
type ParticleClass = "胶结物" | "玻璃珠" | "岩屑" | "单矿物";

type Particle = {
  id: string;
  className: ParticleClass;
  diameter: number;
  sphericity: number;
  fractal: number;
  roughness: number;
  elongation: number;
  texture: string;
  crop: string;
  seed: number;
};

const particles: Particle[] = [
  { id: "CE5-AGR-021", className: "胶结物", diameter: 86.4, sphericity: 0.51, fractal: 2.57, roughness: 8.42, elongation: 1.74, texture: "多孔熔结", crop: "crop-a", seed: 21 },
  { id: "CE5-GLS-014", className: "玻璃珠", diameter: 74.8, sphericity: 0.91, fractal: 2.32, roughness: 1.36, elongation: 1.08, texture: "光滑玻璃质", crop: "crop-b", seed: 14 },
  { id: "CE5-RF-087", className: "岩屑", diameter: 112.6, sphericity: 0.63, fractal: 2.48, roughness: 5.72, elongation: 1.42, texture: "棱角破碎", crop: "crop-c", seed: 87 },
  { id: "CE5-MG-033", className: "单矿物", diameter: 58.2, sphericity: 0.72, fractal: 2.41, roughness: 3.84, elongation: 1.31, texture: "晶面清晰", crop: "crop-d", seed: 33 },
  { id: "CE5-AGR-106", className: "胶结物", diameter: 96.1, sphericity: 0.47, fractal: 2.6, roughness: 9.16, elongation: 1.91, texture: "蜂窝熔结", crop: "crop-c", seed: 106 },
  { id: "CE5-RF-052", className: "岩屑", diameter: 68.7, sphericity: 0.66, fractal: 2.45, roughness: 4.96, elongation: 1.38, texture: "层状断口", crop: "crop-a", seed: 52 },
  { id: "CE5-MG-118", className: "单矿物", diameter: 52.9, sphericity: 0.76, fractal: 2.38, roughness: 3.21, elongation: 1.22, texture: "亚棱角晶粒", crop: "crop-d", seed: 118 },
  { id: "CE5-GLS-041", className: "玻璃珠", diameter: 61.3, sphericity: 0.88, fractal: 2.35, roughness: 1.71, elongation: 1.12, texture: "微坑玻璃质", crop: "crop-b", seed: 41 },
];

const classMeta: Record<ParticleClass, { code: string; count: number; color: string }> = {
  胶结物: { code: "AGR", count: 84, color: "#a74832" },
  玻璃珠: { code: "GLS", count: 37, color: "#657b8e" },
  岩屑: { code: "RF", count: 126, color: "#17324d" },
  单矿物: { code: "MG", count: 104, color: "#9d8168" },
};

const navItems: { key: PageKey; label: string }[] = [
  { key: "browse", label: "数据浏览" },
  { key: "model", label: "三维模型" },
  { key: "classify", label: "分类结果" },
  { key: "stats", label: "统计分析" },
  { key: "about", label: "关于项目" },
];

function Header({ active, onNavigate }: { active: PageKey; onNavigate: (key: PageKey) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <button className="brand" onClick={() => onNavigate("home")} aria-label="返回首页">
        <span className="brand-en">LUPA Atlas</span>
        <span className="brand-rule" />
        <span className="brand-cn">月壤颗粒形貌数据库</span>
      </button>
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="切换导航" aria-expanded={open}>
        <span /><span />
      </button>
      <nav className={open ? "nav open" : "nav"} aria-label="主导航">
        {navItems.map((item) => (
          <button key={item.key} className={active === item.key ? "active" : ""} onClick={() => { onNavigate(item.key); setOpen(false); }}>
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function ArchiveImage({ crop, className = "" }: { crop: string; className?: string }) {
  return <div className={`archive-image ${crop} ${className}`} role="img" aria-label="月壤颗粒标本影像" />;
}

function HomePage({ onNavigate }: { onNavigate: (key: PageKey) => void }) {
  return (
    <>
      <section className="hero page-enter">
        <div className="hero-copy">
          <p className="eyebrow">CHANG’E-5 LUNAR REGOLITH · MORPHOLOGY ARCHIVE</p>
          <h1>解读月壤颗粒的<br />三维形貌</h1>
          <p className="hero-lede">浏览真实颗粒模型，比较多尺度形貌参数，并探索自动分类与统计规律。</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onNavigate("browse")}>探索颗粒数据库 <span>→</span></button>
            <button className="text-button" onClick={() => onNavigate("about")}>查看研究方法</button>
          </div>
          <div className="hero-metrics" aria-label="数据库概览">
            <div><strong>351</strong><span>颗粒</span></div>
            <div><strong>10</strong><span>项形貌参数</span></div>
            <div><strong>94.6<sup>%</sup></strong><span>分类准确率</span></div>
          </div>
        </div>
        <div className="hero-archive" aria-label="月壤颗粒档案图版">
          <div className="hero-specimens" />
          <div className="measure measure-v"><span>100</span><span>50</span><span>0 μm</span></div>
          <div className="specimen-label label-1"><i /> CE5-AGR-021</div>
          <div className="specimen-label label-2"><i /> GLS-014</div>
          <div className="specimen-label label-3">RF-087 <i /></div>
          <div className="measure measure-h">100 μm</div>
          <div className="folio"><b>01</b><span>ATLAS</span></div>
        </div>
      </section>
      <section className="home-index">
        <p className="section-kicker">ARCHIVE INDEX / 档案索引</p>
        <div className="index-grid">
          {[
            ["01", "数据浏览", "按类别、粒径与形貌参数筛选颗粒标本。", "browse"],
            ["02", "三维模型", "旋转、缩放并检查颗粒表面与截面。", "model"],
            ["03", "分类结果", "查看模型预测、混淆矩阵与特征贡献。", "classify"],
            ["04", "统计分析", "探索形貌参数分布与多变量关系。", "stats"],
          ].map(([num, title, copy, key]) => (
            <button key={num} className="index-card" onClick={() => onNavigate(key as PageKey)}>
              <span>{num}</span><h2>{title}</h2><p>{copy}</p><b>进入档案 →</b>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function PageIntro({ index, eyebrow, title, copy }: { index: string; eyebrow: string; title: string; copy: string }) {
  return (
    <div className="page-intro page-enter">
      <div><span className="folio-number">{index}</span><p className="eyebrow">{eyebrow}</p></div>
      <h1>{title}</h1>
      <p>{copy}</p>
    </div>
  );
}

function BrowsePage({ onSelect }: { onSelect: (p: Particle) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"全部" | ParticleClass>("全部");
  const [sort, setSort] = useState("diameter-desc");
  const filtered = useMemo(() => {
    const result = particles.filter((p) => (filter === "全部" || p.className === filter) && p.id.toLowerCase().includes(query.toLowerCase()));
    return [...result].sort((a, b) => sort === "diameter-desc" ? b.diameter - a.diameter : sort === "sphere-desc" ? b.sphericity - a.sphericity : b.fractal - a.fractal);
  }, [query, filter, sort]);

  return (
    <section className="content-page">
      <PageIntro index="01" eyebrow="SPECIMEN CATALOGUE / 标本目录" title="颗粒数据浏览" copy="在统一尺度下检索、比较与追踪每一枚月壤颗粒的三维形貌档案。" />
      <div className="catalog-toolbar">
        <label className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="输入颗粒编号，例如 CE5-AGR-021" /></label>
        <label className="select-box"><span>排序</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="diameter-desc">等效粒径 ↓</option><option value="sphere-desc">球形度 ↓</option><option value="fractal-desc">分形维数 ↓</option></select></label>
      </div>
      <div className="filter-row" role="group" aria-label="颗粒类别筛选">
        {(["全部", "胶结物", "玻璃珠", "岩屑", "单矿物"] as const).map((name) => (
          <button key={name} className={filter === name ? "active" : ""} onClick={() => setFilter(name)}>
            {name}<span>{name === "全部" ? 351 : classMeta[name].count}</span>
          </button>
        ))}
        <p>显示 {filtered.length} 个代表性标本 / 351 个归档颗粒</p>
      </div>
      <div className="specimen-grid">
        {filtered.map((p, index) => (
          <article className="specimen-card" key={p.id} onClick={() => onSelect(p)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSelect(p)}>
            <div className="card-index">{String(index + 1).padStart(2, "0")}</div>
            <ArchiveImage crop={p.crop} />
            <div className="card-title"><div><span>{classMeta[p.className].code}</span><h2>{p.id}</h2></div><b>{p.className}</b></div>
            <dl className="mini-metrics">
              <div><dt>等效粒径</dt><dd>{p.diameter.toFixed(1)} μm</dd></div>
              <div><dt>Wadell 球形度</dt><dd>{p.sphericity.toFixed(2)}</dd></div>
              <div><dt>表面分形维数</dt><dd>{p.fractal.toFixed(2)}</dd></div>
            </dl>
            <button className="card-link" onClick={(e) => { e.stopPropagation(); onSelect(p); }}>打开三维档案 <span>↗</span></button>
          </article>
        ))}
      </div>
    </section>
  );
}

type ViewMode = "surface" | "points" | "ct";

function ParticleCanvas({ particle, mode, slice }: { particle: Particle; mode: ViewMode; slice: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ yaw: 0.55, pitch: -0.22, zoom: 1, dragging: false, x: 0, y: 0 });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let width = 0;
    let height = 0;
    const seed = particle.seed * 0.137;
    const count = 1900;
    const points = Array.from({ length: count }, (_, i) => {
      const y = 1 - (i / (count - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * i;
      let x = Math.cos(theta) * radius;
      let z = Math.sin(theta) * radius;
      const rough = particle.className === "玻璃珠" ? 0.035 : particle.className === "胶结物" ? 0.21 : 0.12;
      const noise = 1 + rough * (0.42 * Math.sin(4.2 * x + seed) * Math.cos(5.1 * y - seed) + 0.34 * Math.sin(7.3 * z + 2 * seed) + 0.24 * Math.cos(11 * (x + y + z)));
      x *= noise * (particle.elongation > 1.6 ? 1.15 : 1.03);
      z *= noise;
      return { x, y: y * noise * (particle.className === "胶结物" ? 0.92 : 1), z, n: noise };
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width; height = rect.height;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();

    const draw = () => {
      const s = state.current;
      if (!s.dragging) s.yaw += 0.00125;
      ctx.clearRect(0, 0, width, height);
      const size = Math.min(width, height) * 0.29 * s.zoom;
      const cy = height * 0.49;
      const cosy = Math.cos(s.yaw), siny = Math.sin(s.yaw), cosp = Math.cos(s.pitch), sinp = Math.sin(s.pitch);
      const projected = points.map((p, i) => {
        const x1 = p.x * cosy - p.z * siny;
        const z1 = p.x * siny + p.z * cosy;
        const y1 = p.y * cosp - z1 * sinp;
        const z2 = p.y * sinp + z1 * cosp;
        return { x: width / 2 + x1 * size, y: cy + y1 * size, z: z2, n: p.n, i };
      }).filter((p) => slice >= 98 || p.z < (slice / 100) * 2 - 0.55).sort((a, b) => a.z - b.z);

      if (mode === "ct") {
        const g = ctx.createRadialGradient(width / 2 - size * .2, cy - size * .2, 2, width / 2, cy, size * 1.15);
        g.addColorStop(0, "rgba(88,232,255,.18)"); g.addColorStop(0.62, "rgba(25,79,112,.12)"); g.addColorStop(1, "rgba(8,17,31,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(width / 2, cy, size * 1.2, 0, Math.PI * 2); ctx.fill();
      }

      projected.forEach((p) => {
        const light = Math.max(0, Math.min(1, (p.z + 1.15) / 2.2));
        const r = mode === "points" ? 1.15 : 1.8 + light * 1.65;
        if (mode === "ct") ctx.fillStyle = `rgba(${Math.round(49 + light * 79)},${Math.round(129 + light * 104)},${Math.round(164 + light * 90)},${0.25 + light * 0.72})`;
        else if (mode === "points") ctx.fillStyle = `rgba(43,228,255,${0.18 + light * 0.8})`;
        else {
          const v = Math.round(70 + light * 142 + (p.n - 1) * 80);
          ctx.fillStyle = `rgb(${v},${Math.max(50, v - 4)},${Math.max(46, v - 10)})`;
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      });

      ctx.strokeStyle = "rgba(43,228,255,.32)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(width / 2, cy, size * 1.22, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(width / 2, cy, size * 1.42, size * .34, -0.18, 0, Math.PI * 2); ctx.stroke();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [particle, mode, slice]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    state.current.dragging = true; state.current.x = e.clientX; state.current.y = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = state.current; if (!s.dragging) return;
    s.yaw += (e.clientX - s.x) * 0.008; s.pitch += (e.clientY - s.y) * 0.006;
    s.pitch = Math.max(-1.2, Math.min(1.2, s.pitch)); s.x = e.clientX; s.y = e.clientY;
  };
  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault(); state.current.zoom = Math.max(.72, Math.min(1.42, state.current.zoom - e.deltaY * .001));
  };
  return <canvas ref={ref} className="particle-canvas" aria-label={`可交互三维颗粒模型 ${particle.id}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => state.current.dragging = false} onPointerCancel={() => state.current.dragging = false} onWheel={onWheel} />;
}

function ModelPage({ particle, setParticle }: { particle: Particle; setParticle: (p: Particle) => void }) {
  const [mode, setMode] = useState<ViewMode>("surface");
  const [slice, setSlice] = useState(100);
  return (
    <section className="content-page">
      <PageIntro index="02" eyebrow="DIGITAL SPECIMEN / 数字标本" title="三维模型检视" copy="拖拽旋转、滚轮缩放；切换表面、点云与 CT 模式，观察颗粒多尺度结构。" />
      <div className="model-layout page-enter">
        <div className="model-viewer">
          <div className="viewer-topbar">
            <div><span className="live-dot" /> LIVE MODEL <b>{particle.id}</b></div>
            <div className="mode-switch" role="group" aria-label="显示模式">
              {([['surface','表面'],['points','点云'],['ct','CT']] as const).map(([key, label]) => <button key={key} className={mode === key ? "active" : ""} onClick={() => setMode(key)}>{label}</button>)}
            </div>
          </div>
          <ParticleCanvas particle={particle} mode={mode} slice={slice} />
          <div className="viewer-readout left"><span>X</span> 38.44 μm<br /><span>Y</span> 52.08 μm<br /><span>Z</span> 61.17 μm</div>
          <div className="viewer-readout right">VOXEL 1.00 μm<br />VERTICES 48,216<br />MESH WATERTIGHT</div>
          <div className="viewer-help"><span>拖拽旋转</span><span>滚轮缩放</span><span>双击复位</span></div>
        </div>
        <aside className="model-panel">
          <div className="specimen-heading"><span>{classMeta[particle.className].code}</span><h2>{particle.id}</h2><b>{particle.className}</b></div>
          <p className="panel-description">{particle.texture}表面结构，三维模型经 Micro-CT 分割、孔洞修复与网格重建获得。</p>
          <div className="metric-list">
            {[
              ["等效球径", `${particle.diameter.toFixed(1)} μm`, "Dₛ"],
              ["Wadell 球形度", particle.sphericity.toFixed(3), "Ψ"],
              ["伸长率", particle.elongation.toFixed(2), "E"],
              ["算术平均粗糙度", `${particle.roughness.toFixed(2)} μm`, "Rₐ"],
              ["表面分形维数", particle.fractal.toFixed(3), "Dƒ"],
              ["各向异性", particle.className === "玻璃珠" ? "0.08" : "0.31", "Aᵢ"],
            ].map(([label, value, symbol]) => <div key={label}><span><i>{symbol}</i>{label}</span><strong>{value}</strong></div>)}
          </div>
          <label className="slice-control"><span>剖面深度 <b>{slice}%</b></span><input type="range" min="25" max="100" value={slice} onChange={(e) => setSlice(Number(e.target.value))} /></label>
          <div className="particle-picker"><p>切换代表性标本</p><div>{particles.slice(0, 4).map((p) => <button key={p.id} className={p.id === particle.id ? "active" : ""} onClick={() => setParticle(p)}><ArchiveImage crop={p.crop} /><span>{classMeta[p.className].code}</span></button>)}</div></div>
        </aside>
      </div>
    </section>
  );
}

function ClassificationPage({ particle, setParticle }: { particle: Particle; setParticle: (p: Particle) => void }) {
  const probabilities = particle.className === "胶结物" ? [94.6, 1.2, 3.1, 1.1] : particle.className === "玻璃珠" ? [1.6, 96.2, 1.4, .8] : particle.className === "岩屑" ? [2.8, 1.1, 88.4, 7.7] : [1.9, .7, 9.6, 87.8];
  const labels: ParticleClass[] = ["胶结物", "玻璃珠", "岩屑", "单矿物"];
  const matrix = [[95,1,3,1],[2,96,1,1],[2,1,91,6],[1,1,8,90]];
  return (
    <section className="content-page">
      <PageIntro index="03" eyebrow="MORPHOLOGY CLASSIFIER / 形貌分类器" title="自动分类结果" copy="基于形状—纹理解耦特征的支持向量分类器，并以可解释方式展示判别依据。" />
      <div className="classification-grid page-enter">
        <article className="prediction-card">
          <div className="block-title"><span>A</span><div><p>SELECTED SPECIMEN</p><h2>单颗粒预测</h2></div></div>
          <div className="prediction-specimen"><ArchiveImage crop={particle.crop} /><div><select value={particle.id} onChange={(e) => setParticle(particles.find((p) => p.id === e.target.value) || particle)}>{particles.map((p) => <option key={p.id}>{p.id}</option>)}</select><p>预测类别</p><strong>{particle.className}</strong><span>置信度 {Math.max(...probabilities).toFixed(1)}%</span></div></div>
          <div className="probability-bars">{labels.map((label, i) => <div key={label}><span>{label}</span><i><b style={{ width: `${probabilities[i]}%`, background: classMeta[label].color }} /></i><strong>{probabilities[i].toFixed(1)}%</strong></div>)}</div>
        </article>
        <article className="matrix-card">
          <div className="block-title"><span>B</span><div><p>VALIDATION SET</p><h2>混淆矩阵</h2></div><strong className="accuracy">94.6%<small>总体准确率</small></strong></div>
          <div className="matrix-wrap">
            <span className="matrix-y">真实类别</span>
            <div className="matrix-labels top">{labels.map((l) => <span key={l}>{l}</span>)}</div>
            <div className="matrix-labels side">{labels.map((l) => <span key={l}>{l}</span>)}</div>
            <div className="confusion-matrix">{matrix.flatMap((row, r) => row.map((value, c) => <div key={`${r}-${c}`} className={r === c ? "diagonal" : ""} style={{ opacity: .26 + value / 130 }}><strong>{value}</strong><span>%</span></div>))}</div>
            <span className="matrix-x">预测类别</span>
          </div>
        </article>
        <article className="feature-card">
          <div className="block-title"><span>C</span><div><p>MODEL INTERPRETATION</p><h2>判别特征贡献</h2></div></div>
          <div className="feature-list">{[["Wadell 球形度",92],["比表面积",84],["表面分形维数",76],["算术平均粗糙度",68],["各向异性",51],["伸长率",43]].map(([name, v], i) => <div key={String(name)}><span>{String(i+1).padStart(2,"0")}</span><p>{name}</p><i><b style={{ width: `${v}%` }} /></i><strong>{v}</strong></div>)}</div>
        </article>
      </div>
    </section>
  );
}

function ScatterPlot({ xKey, classFilter }: { xKey: string; classFilter: string }) {
  const dots = Array.from({ length: 68 }, (_, i) => {
    const group = i % 4;
    const x = 9 + ((i * 37 + group * 11) % 82);
    const baseline = group === 0 ? 70 : group === 1 ? 24 : group === 2 ? 48 : 42;
    const trend = xKey === "diameter" ? (group === 0 ? -0.18 : 0.08) * (x - 50) : (group === 1 ? -.05 : .14) * (x - 50);
    const y = Math.max(8, Math.min(90, baseline + trend + Math.sin(i * 2.1) * 8));
    return { x, y, group };
  });
  return (
    <div className="scatter-plot">
      <div className="chart-y-label">表面分形维数 Dƒ</div>
      <div className="plot-area">
        {[0,1,2,3,4].map((i) => <i className="gridline" style={{ top: `${i*25}%` }} key={i} />)}
        {dots.filter((d) => classFilter === "全部" || labelsForChart[d.group] === classFilter).map((d, i) => <button key={i} className={`dot group-${d.group}`} style={{ left: `${d.x}%`, bottom: `${d.y}%` }} aria-label={`${labelsForChart[d.group]} 数据点`} title={`${labelsForChart[d.group]} · Dƒ ${(2.28 + d.y / 300).toFixed(2)}`} />)}
        <span className="axis-y top">2.60</span><span className="axis-y mid">2.45</span><span className="axis-y bottom">2.30</span>
      </div>
      <div className="chart-x-label">{xKey === "diameter" ? "等效粒径 Dₛ / μm" : "Wadell 球形度 Ψ"}</div>
    </div>
  );
}
const labelsForChart: ParticleClass[] = ["胶结物", "玻璃珠", "岩屑", "单矿物"];

function StatsPage() {
  const [xKey, setXKey] = useState("diameter");
  const [filter, setFilter] = useState("全部");
  return (
    <section className="content-page">
      <PageIntro index="04" eyebrow="MORPHOMETRIC ANALYSIS / 形貌统计" title="统计分析工作台" copy="从类别分布、尺度效应与参数关联三个层次，探索颗粒形貌的群体规律。" />
      <div className="stats-toolbar page-enter"><div><span>横轴参数</span><select value={xKey} onChange={(e) => setXKey(e.target.value)}><option value="diameter">等效粒径 Dₛ</option><option value="sphericity">Wadell 球形度 Ψ</option></select></div><div><span>颗粒类别</span><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>全部</option>{labelsForChart.map((l) => <option key={l}>{l}</option>)}</select></div><button onClick={() => { setXKey("diameter"); setFilter("全部"); }}>重置视图</button></div>
      <div className="stats-grid">
        <article className="scatter-card">
          <div className="block-title"><span>A</span><div><p>MULTIVARIATE VIEW</p><h2>粒径—纹理关联</h2></div><div className="chart-legend">{labelsForChart.map((l,i) => <span key={l}><i className={`group-${i}`} />{l}</span>)}</div></div>
          <ScatterPlot xKey={xKey} classFilter={filter} />
          <p className="chart-note"><b>观察：</b>胶结物在各粒径范围内均表现出较高且稳定的分形维数；玻璃珠则集中于低粗糙度、低分形维数区域。</p>
        </article>
        <article className="distribution-card">
          <div className="block-title"><span>B</span><div><p>CLASS DISTRIBUTION</p><h2>颗粒类别构成</h2></div></div>
          <div className="donut-wrap"><div className="donut"><span><strong>351</strong>归档颗粒</span></div><div className="donut-legend">{labelsForChart.map((l) => <div key={l}><i style={{ background: classMeta[l].color }} /><span>{l}</span><strong>{classMeta[l].count}</strong><small>{(classMeta[l].count/351*100).toFixed(1)}%</small></div>)}</div></div>
        </article>
        <article className="range-card">
          <div className="block-title"><span>C</span><div><p>DESCRIPTOR RANGE</p><h2>形貌参数范围</h2></div></div>
          <div className="range-table">{[["球形度 Ψ",24,88,"0.42","0.94"],["伸长率 E",12,72,"1.03","2.14"],["粗糙度 Rₐ",18,93,"0.82","9.61"],["分形维数 Dƒ",31,84,"2.29","2.60"]].map(([name,start,end,min,max]) => <div key={String(name)}><span>{name}</span><small>{min}</small><i><b style={{ left: `${start}%`, width: `${Number(end)-Number(start)}%` }} /></i><small>{max}</small></div>)}</div>
        </article>
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <section className="content-page about-page">
      <PageIntro index="05" eyebrow="RESEARCH FRAMEWORK / 研究框架" title="从三维重建到形貌认知" copy="LUPA Atlas 将真实月壤颗粒的数字化保存、定量表征和自动分类组织为可复用的开放研究框架。" />
      <div className="method-flow page-enter">
        {[["01","Micro-CT 重建","体素分辨率约 1 μm；完成颗粒分割、孔洞修复与水密网格重建。"],["02","尺度解耦表征","区分宏观形状与微观纹理，形成 10 项可解释的三维形貌参数。"],["03","自动分类","基于遗传与岩相类别构建 SVM 分类器，并评估特征贡献。"],["04","数据库归档","关联模型、参数、类别与统计结果，支持检索、比较及数据复用。"]].map(([n,t,c]) => <article key={n}><span>{n}</span><h2>{t}</h2><p>{c}</p></article>)}
      </div>
      <div className="about-columns">
        <article><p className="section-kicker">SCIENTIFIC QUESTION</p><h2>颗粒成因如何编码于三维形貌？</h2><p>月球空间风化、撞击破碎与熔融胶结过程在颗粒的轮廓、表面粗糙度及分形尺度中留下差异化信号。本框架以量化指标替代单纯的二维定性描述。</p></article>
        <article><p className="section-kicker">DATA NOTE</p><h2>当前原型的数据边界</h2><p>界面展示基于 351 枚、等效粒径大于 50 μm 的代表性颗粒统计结构。网站中的单颗粒编号与部分数值为交互演示数据，可在后续接入真实 CSV 与 STL/OBJ 模型。</p></article>
      </div>
    </section>
  );
}

export default function Home() {
  const [page, setPage] = useState<PageKey>("home");
  const [selected, setSelected] = useState(particles[0]);
  const assetBase = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const navigate = (key: PageKey) => { setPage(key); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openParticle = (p: Particle) => { setSelected(p); navigate("model"); };
  return (
    <main style={{ "--particle-image": `url("${assetBase}/lunar-particles.webp")` } as CSSProperties}>
      <Header active={page} onNavigate={navigate} />
      {page === "home" && <HomePage onNavigate={navigate} />}
      {page === "browse" && <BrowsePage onSelect={openParticle} />}
      {page === "model" && <ModelPage particle={selected} setParticle={setSelected} />}
      {page === "classify" && <ClassificationPage particle={selected} setParticle={setSelected} />}
      {page === "stats" && <StatsPage />}
      {page === "about" && <AboutPage />}
      <footer><div><span className="brand-en">LUPA Atlas</span><p>月壤颗粒形貌数据库 · 科研演示原型</p></div><p>CHANG’E-5 LUNAR REGOLITH<br />MORPHOLOGY ARCHIVE</p><span>© 2026</span></footer>
    </main>
  );
}
