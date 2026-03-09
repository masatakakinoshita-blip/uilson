/**
 * Layout Renderers — Parameterized preview rendering for 45+ layout variants.
 * Each base type (text, list, grid, columns, chart, timeline, framework, cover)
 * has one renderer that adapts via style params from the layout catalog.
 */
import { getLayout, normalizeLayoutId } from "../data/layouts";

const CHART_COLORS = ["#3C5996","#C83732","#2E7D32","#D4880F","#8E24AA","#00838F","#AD1457"];

/* ══════════════════════════════════════════
   PREVIEW RENDERERS (React JSX)
   ══════════════════════════════════════════ */

/** Text-based layouts */
const TextRenderer = ({ slide, style, colors }) => {
  const { accent, textColor, subColor, headingFont, bodyFont } = colors;
  const bodyText = slide.body || "";

  if (style.highlight) {
    return (
      <div style={{ flex:1, width:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:"28px", fontWeight:800, textAlign:"center", lineHeight:1.5, color:accent, fontFamily:headingFont, maxWidth:"80%", padding:"24px", background:`${accent}08`, borderRadius:"16px", border:`2px solid ${accent}20` }}>
          {bodyText}
        </div>
      </div>
    );
  }

  if (style.quote) {
    return (
      <div style={{ flex:1, width:"100%", display:"flex", alignItems:"center", padding:"0 40px" }}>
        <div style={{ borderLeft:`4px solid ${accent}`, paddingLeft:"24px" }}>
          <div style={{ fontSize:"24px", fontStyle:"italic", lineHeight:1.6, color:textColor, fontFamily:bodyFont }}>{bodyText}</div>
          {slide.sub && <div style={{ marginTop:"12px", fontSize:"14px", color:subColor, fontFamily:bodyFont }}>— {slide.sub}</div>}
        </div>
      </div>
    );
  }

  if (style.callout) {
    return (
      <div style={{ flex:1, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 40px" }}>
        <div style={{ background:`${accent}10`, border:`1px solid ${accent}25`, borderRadius:"12px", padding:"28px 32px", width:"100%" }}>
          <div style={{ fontSize:"20px", fontWeight:700, color:accent, marginBottom:"8px", fontFamily:headingFont }}>💡</div>
          <div style={{ fontSize:"17px", lineHeight:1.7, color:textColor, fontFamily:bodyFont }}>{bodyText}</div>
        </div>
      </div>
    );
  }

  if (style.sidebar) {
    const parts = bodyText.split("\n").filter(Boolean);
    const mainText = parts.slice(0, -1).join("\n") || bodyText;
    const sideText = parts.length > 1 ? parts[parts.length-1] : slide.sub || "";
    return (
      <div style={{ flex:1, width:"100%", display:"flex", gap:"20px" }}>
        <div style={{ flex:2, fontSize:"16px", lineHeight:1.7, color:textColor, fontFamily:bodyFont, whiteSpace:"pre-wrap" }}>{mainText}</div>
        <div style={{ flex:1, background:`${accent}08`, borderRadius:"10px", padding:"16px", borderLeft:`3px solid ${accent}` }}>
          <div style={{ fontSize:"13px", color:subColor, fontFamily:bodyFont, lineHeight:1.6 }}>{sideText}</div>
        </div>
      </div>
    );
  }

  if (style.columns === 2) {
    const mid = Math.ceil(bodyText.length / 2);
    const breakIdx = bodyText.indexOf("\n", mid - 20);
    const col1 = breakIdx > 0 ? bodyText.slice(0, breakIdx) : bodyText.slice(0, mid);
    const col2 = breakIdx > 0 ? bodyText.slice(breakIdx + 1) : bodyText.slice(mid);
    return (
      <div style={{ flex:1, width:"100%", display:"flex", gap:"24px" }}>
        <div style={{ flex:1, fontSize:"15px", lineHeight:1.7, color:textColor, fontFamily:bodyFont, whiteSpace:"pre-wrap" }}>{col1}</div>
        <div style={{ width:"1px", background:`${accent}20` }} />
        <div style={{ flex:1, fontSize:"15px", lineHeight:1.7, color:textColor, fontFamily:bodyFont, whiteSpace:"pre-wrap" }}>{col2}</div>
      </div>
    );
  }

  if (style.numbered) {
    const paras = bodyText.split("\n").filter(Boolean);
    return (
      <div style={{ flex:1, width:"100%", display:"flex", flexDirection:"column", gap:"12px" }}>
        {paras.map((p, i) => (
          <div key={i} style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
            <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:accent, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:700, flexShrink:0 }}>{i+1}</div>
            <div style={{ fontSize:"15px", lineHeight:1.6, color:textColor, fontFamily:bodyFont, flex:1 }}>{p}</div>
          </div>
        ))}
      </div>
    );
  }

  if (style.agenda) {
    const items = bodyText.split("\n").filter(Boolean);
    return (
      <div style={{ flex:1, width:"100%", display:"flex", flexDirection:"column", gap:"6px" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 16px", background:i%2===0 ? `${accent}06` : "transparent", borderRadius:"8px" }}>
            <div style={{ fontSize:"22px", fontWeight:800, color:accent, fontFamily:headingFont, width:"32px", textAlign:"right" }}>{String(i+1).padStart(2,"0")}</div>
            <div style={{ width:"2px", height:"20px", background:`${accent}30`, borderRadius:"1px" }} />
            <div style={{ fontSize:"16px", color:textColor, fontFamily:bodyFont, flex:1 }}>{item}</div>
          </div>
        ))}
      </div>
    );
  }

  // Default: standard text
  return (
    <div style={{ fontSize:"16px", lineHeight:1.7, whiteSpace:"pre-wrap", color:textColor, flex:1, width:"100%", fontFamily:bodyFont }}>{bodyText}</div>
  );
};

/** List/Bullet layouts */
const ListRenderer = ({ slide, style, colors }) => {
  const { accent, textColor, subColor, headingFont, bodyFont } = colors;
  const items = slide.items || [];

  if (style.grid) {
    const cols = items.length <= 4 ? 2 : 3;
    return (
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:"12px", flex:1, width:"100%", alignContent:"start" }}>
        {items.map((item, i) => (
          <div key={i} style={{ background:`${accent}06`, borderRadius:"10px", padding: style.bigIcon ? "16px 12px" : "12px 14px", border:`1px solid ${accent}12`, textAlign: style.bigIcon ? "center" : "left" }}>
            {style.icon && <div style={{ fontSize: style.bigIcon ? "28px" : "18px", marginBottom:"6px" }}>{item.icon || "▶"}</div>}
            <div style={{ fontSize:"14px", fontWeight:700, color:textColor, fontFamily:headingFont, marginBottom:"2px" }}>{item.label}</div>
            {item.desc && <div style={{ fontSize:"11px", color:subColor, fontFamily:bodyFont, lineHeight:1.4 }}>{item.desc}</div>}
          </div>
        ))}
      </div>
    );
  }

  if (style.columns === 2) {
    const mid = Math.ceil(items.length / 2);
    const col1 = items.slice(0, mid);
    const col2 = items.slice(mid);
    const renderItem = (item, i) => (
      <div key={i} style={{ display:"flex", gap:"10px", alignItems:"flex-start", marginBottom:"10px" }}>
        <span style={{ color:accent, fontWeight:700, flexShrink:0 }}>{style.icon ? (item.icon || "▶") : "•"}</span>
        <div>
          <div style={{ fontSize:"14px", fontWeight:600, color:textColor, fontFamily:headingFont }}>{item.label}</div>
          {item.desc && <div style={{ fontSize:"12px", color:subColor, fontFamily:bodyFont }}>{item.desc}</div>}
        </div>
      </div>
    );
    return (
      <div style={{ display:"flex", gap:"24px", flex:1, width:"100%" }}>
        <div style={{ flex:1 }}>{col1.map(renderItem)}</div>
        <div style={{ width:"1px", background:`${accent}15` }} />
        <div style={{ flex:1 }}>{col2.map(renderItem)}</div>
      </div>
    );
  }

  if (style.checklist) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:"8px", flex:1, width:"100%" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"10px", padding:"8px 12px", borderRadius:"6px", background: i%2===0 ? `${accent}04` : "transparent" }}>
            <span style={{ fontSize:"16px", flexShrink:0, marginTop:"1px" }}>☑️</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"15px", fontWeight:600, color:textColor, fontFamily:headingFont }}>{item.label}</div>
              {item.desc && <div style={{ fontSize:"12px", color:subColor, fontFamily:bodyFont, marginTop:"2px" }}>{item.desc}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (style.numbered) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:"10px", flex:1, width:"100%" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"12px" }}>
            <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:accent, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:800, flexShrink:0 }}>{i+1}</div>
            <div style={{ flex:1, paddingTop:"4px" }}>
              <div style={{ fontSize:"15px", fontWeight:700, color:textColor, fontFamily:headingFont }}>{item.label}</div>
              {item.desc && <div style={{ fontSize:"12px", color:subColor, fontFamily:bodyFont, marginTop:"2px" }}>{item.desc}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (style.minimal) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:"6px", flex:1, width:"100%" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display:"flex", alignItems:"baseline", gap:"10px", padding:"6px 0", borderBottom:`1px solid ${accent}10` }}>
            <span style={{ color:accent, fontSize:"8px", flexShrink:0 }}>●</span>
            <span style={{ fontSize:"15px", fontWeight:600, color:textColor, fontFamily:headingFont }}>{item.label}</span>
            {item.desc && <span style={{ fontSize:"12px", color:subColor, fontFamily:bodyFont, flex:1 }}>— {item.desc}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (style.vertical && style.timeline) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:"0", flex:1, width:"100%", paddingLeft:"20px", position:"relative" }}>
        <div style={{ position:"absolute", left:"32px", top:"8px", bottom:"8px", width:"2px", background:`${accent}25` }} />
        {items.map((item, i) => (
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"16px", padding:"8px 0", position:"relative" }}>
            <div style={{ width:"24px", height:"24px", borderRadius:"50%", background:accent, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:800, flexShrink:0, zIndex:1 }}>{i+1}</div>
            <div>
              <div style={{ fontSize:"14px", fontWeight:700, color:textColor, fontFamily:headingFont }}>{item.label}</div>
              {item.desc && <div style={{ fontSize:"12px", color:subColor, fontFamily:bodyFont, marginTop:"2px" }}>{item.desc}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: icon + card + borderLeft (original bullets)
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px", flex:1, width:"100%", overflow:"hidden" }}>
      {items.map((item, i) => (
        <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"12px", background: style.card ? `${accent}06` : "transparent", borderRadius:"8px", padding: style.card ? "10px 14px" : "4px 0", borderLeft: style.borderLeft ? `3px solid ${accent}` : "none" }}>
          {style.icon && <span style={{ fontSize:"20px", flexShrink:0, lineHeight:1.2 }}>{item.icon || "▶"}</span>}
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:"15px", color:textColor, fontFamily:headingFont }}>{item.label}</div>
            {item.desc && <div style={{ fontSize:"12px", color:subColor, fontFamily:bodyFont, lineHeight:1.4 }}>{item.desc}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

/** Grid/Stats layouts */
const GridRenderer = ({ slide, style, colors }) => {
  const { accent, textColor, subColor, headingFont, bodyFont } = colors;
  const stats = slide.stats || [];

  if (style.single && stats.length > 0) {
    const st = stats[0];
    return (
      <div style={{ flex:1, width:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"72px", fontWeight:900, color:accent, fontFamily:headingFont, lineHeight:1 }}>{st.value}</div>
          <div style={{ fontSize:"20px", fontWeight:600, color:textColor, marginTop:"12px", fontFamily:bodyFont }}>{st.label}</div>
          {st.sub && <div style={{ fontSize:"14px", color:subColor, marginTop:"6px", fontFamily:bodyFont }}>{st.sub}</div>}
        </div>
      </div>
    );
  }

  if (style.progress) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:"18px", flex:1, width:"100%", justifyContent:"center" }}>
        {stats.map((st, i) => {
          const numVal = parseInt(String(st.value).replace(/[^0-9.]/g, "")) || 0;
          const pct = Math.min(numVal, 100);
          return (
            <div key={i}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                <span style={{ fontSize:"14px", fontWeight:600, color:textColor, fontFamily:headingFont }}>{st.label}</span>
                <span style={{ fontSize:"14px", fontWeight:800, color:accent, fontFamily:headingFont }}>{st.value}</span>
              </div>
              <div style={{ height:"12px", background:`${accent}12`, borderRadius:"6px", overflow:"hidden" }}>
                <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg, ${accent}, ${accent}CC)`, borderRadius:"6px", transition:"width 0.3s" }} />
              </div>
              {st.sub && <div style={{ fontSize:"11px", color:subColor, marginTop:"2px", fontFamily:bodyFont }}>{st.sub}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  if (style.trend) {
    return (
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(stats.length,4)}, 1fr)`, gap:"14px", flex:1, width:"100%", alignContent:"center" }}>
        {stats.map((st, i) => (
          <div key={i} style={{ background:`${accent}06`, borderRadius:"10px", padding:"16px", textAlign:"center", border:`1px solid ${accent}12` }}>
            <div style={{ fontSize:"32px", fontWeight:900, color:accent, fontFamily:headingFont }}>{st.value}</div>
            <div style={{ fontSize:"16px", color:"#2E7D32", fontWeight:700, margin:"4px 0" }}>↑</div>
            <div style={{ fontSize:"13px", fontWeight:600, color:textColor, fontFamily:bodyFont }}>{st.label}</div>
            {st.sub && <div style={{ fontSize:"11px", color:subColor, fontFamily:bodyFont }}>{st.sub}</div>}
          </div>
        ))}
      </div>
    );
  }

  if (style.dashboard) {
    return (
      <div style={{ display:"grid", gridTemplateColumns: stats.length <= 2 ? "1fr 1fr" : `repeat(${Math.min(stats.length,3)}, 1fr)`, gap:"12px", flex:1, width:"100%", alignContent:"center" }}>
        {stats.map((st, i) => (
          <div key={i} style={{ background:"#fff", borderRadius:"10px", padding:"16px 12px", textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.08)", border:"1px solid #E8E8E8" }}>
            <div style={{ fontSize:"11px", color:subColor, fontFamily:bodyFont, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.5px" }}>{st.label}</div>
            <div style={{ fontSize:"36px", fontWeight:900, color:accent, fontFamily:headingFont, lineHeight:1.1 }}>{st.value}</div>
            {st.sub && <div style={{ fontSize:"11px", color:subColor, fontFamily:bodyFont, marginTop:"6px" }}>{st.sub}</div>}
          </div>
        ))}
      </div>
    );
  }

  if (style.meter) {
    return (
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(stats.length,4)}, 1fr)`, gap:"16px", flex:1, width:"100%", alignContent:"center" }}>
        {stats.map((st, i) => {
          const numVal = parseInt(String(st.value).replace(/[^0-9.]/g, "")) || 0;
          const pct = Math.min(numVal, 100);
          const r = 40;
          const circ = 2 * Math.PI * r;
          const dash = circ * pct / 100;
          return (
            <div key={i} style={{ textAlign:"center" }}>
              <svg width="100" height="60" viewBox="0 0 100 60" style={{ overflow:"visible" }}>
                <path d={`M 10 55 A 40 40 0 0 1 90 55`} fill="none" stroke={`${accent}15`} strokeWidth="8" strokeLinecap="round" />
                <path d={`M 10 55 A 40 40 0 0 1 90 55`} fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${dash * 0.62} ${circ}`} />
              </svg>
              <div style={{ fontSize:"22px", fontWeight:900, color:accent, fontFamily:headingFont, marginTop:"-8px" }}>{st.value}</div>
              <div style={{ fontSize:"12px", fontWeight:600, color:textColor, fontFamily:bodyFont, marginTop:"4px" }}>{st.label}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // Default: big number cards
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(stats.length,4)}, 1fr)`, gap:"16px", flex:1, width:"100%", alignContent:"center" }}>
      {stats.map((st, i) => (
        <div key={i} style={{ background:`${accent}08`, borderRadius:"12px", padding:"20px 14px", textAlign:"center", border:`1px solid ${accent}15` }}>
          <div style={{ fontSize:"36px", fontWeight:900, color:accent, fontFamily:headingFont, lineHeight:1.2, marginBottom:"6px" }}>{st.value}</div>
          <div style={{ fontSize:"14px", fontWeight:600, color:textColor, fontFamily:bodyFont }}>{st.label}</div>
          {st.sub && <div style={{ fontSize:"11px", color:subColor, fontFamily:bodyFont, marginTop:"4px" }}>{st.sub}</div>}
        </div>
      ))}
    </div>
  );
};

/** Column/Comparison layouts */
const ColumnsRenderer = ({ slide, style, colors }) => {
  const { accent, textColor, subColor, headingFont, bodyFont, V } = colors;
  const cols = slide.columns || [];

  if (style.vs && cols.length >= 2) {
    return (
      <div style={{ flex:1, width:"100%", display:"flex", alignItems:"stretch", gap:"0" }}>
        <div style={{ flex:1, background:`${accent}08`, borderRadius:"10px 0 0 10px", padding:"20px", display:"flex", flexDirection:"column" }}>
          <div style={{ fontSize:"18px", fontWeight:800, color:accent, fontFamily:headingFont, marginBottom:"12px", textAlign:"center" }}>{cols[0].title}</div>
          {(cols[0].items||[]).map((item, j) => <div key={j} style={{ fontSize:"13px", color:textColor, fontFamily:bodyFont, padding:"4px 0", lineHeight:1.5 }}>• {item}</div>)}
        </div>
        <div style={{ width:"40px", display:"flex", alignItems:"center", justifyContent:"center", background:`${accent}`, color:"#fff", fontWeight:900, fontSize:"14px", borderRadius:"4px", margin:"20px 0" }}>VS</div>
        <div style={{ flex:1, background:`#C8373208`, borderRadius:"0 10px 10px 0", padding:"20px", display:"flex", flexDirection:"column" }}>
          <div style={{ fontSize:"18px", fontWeight:800, color:"#C83732", fontFamily:headingFont, marginBottom:"12px", textAlign:"center" }}>{cols[1].title}</div>
          {(cols[1].items||[]).map((item, j) => <div key={j} style={{ fontSize:"13px", color:textColor, fontFamily:bodyFont, padding:"4px 0", lineHeight:1.5 }}>• {item}</div>)}
        </div>
      </div>
    );
  }

  if (style.prosCons && cols.length >= 2) {
    return (
      <div style={{ flex:1, width:"100%", display:"flex", gap:"16px" }}>
        <div style={{ flex:1, borderRadius:"10px", overflow:"hidden", border:"1px solid #2E7D3230" }}>
          <div style={{ background:"#2E7D32", color:"#fff", padding:"10px 16px", fontSize:"15px", fontWeight:700, fontFamily:headingFont, display:"flex", alignItems:"center", gap:"8px" }}>👍 {cols[0].title}</div>
          <div style={{ padding:"12px 16px" }}>{(cols[0].items||[]).map((item, j) => <div key={j} style={{ fontSize:"13px", color:textColor, fontFamily:bodyFont, padding:"4px 0" }}>✓ {item}</div>)}</div>
        </div>
        <div style={{ flex:1, borderRadius:"10px", overflow:"hidden", border:"1px solid #C8373230" }}>
          <div style={{ background:"#C83732", color:"#fff", padding:"10px 16px", fontSize:"15px", fontWeight:700, fontFamily:headingFont, display:"flex", alignItems:"center", gap:"8px" }}>👎 {cols[1].title}</div>
          <div style={{ padding:"12px 16px" }}>{(cols[1].items||[]).map((item, j) => <div key={j} style={{ fontSize:"13px", color:textColor, fontFamily:bodyFont, padding:"4px 0" }}>✗ {item}</div>)}</div>
        </div>
      </div>
    );
  }

  if (style.beforeAfter && cols.length >= 2) {
    return (
      <div style={{ flex:1, width:"100%", display:"flex", alignItems:"stretch", gap:"0" }}>
        <div style={{ flex:1, background:"#FFF3E0", borderRadius:"10px 0 0 10px", padding:"20px" }}>
          <div style={{ fontSize:"16px", fontWeight:800, color:"#D4880F", fontFamily:headingFont, marginBottom:"12px" }}>Before</div>
          {(cols[0].items||[]).map((item, j) => <div key={j} style={{ fontSize:"13px", color:textColor, fontFamily:bodyFont, padding:"4px 0" }}>• {item}</div>)}
        </div>
        <div style={{ width:"36px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px" }}>→</div>
        <div style={{ flex:1, background:"#E8F5E9", borderRadius:"0 10px 10px 0", padding:"20px" }}>
          <div style={{ fontSize:"16px", fontWeight:800, color:"#2E7D32", fontFamily:headingFont, marginBottom:"12px" }}>After</div>
          {(cols[1].items||[]).map((item, j) => <div key={j} style={{ fontSize:"13px", color:textColor, fontFamily:bodyFont, padding:"4px 0" }}>• {item}</div>)}
        </div>
      </div>
    );
  }

  if (style.featureTable) {
    return (
      <div style={{ flex:1, width:"100%", overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:`2fr repeat(${cols.length}, 1fr)`, gap:"1px", background:`${accent}15`, borderRadius:"8px", overflow:"hidden" }}>
          <div style={{ background:accent, padding:"8px 12px", fontSize:"13px", fontWeight:700, color:"#fff", fontFamily:headingFont }}>機能</div>
          {cols.map((col, i) => <div key={i} style={{ background:accent, padding:"8px 12px", fontSize:"13px", fontWeight:700, color:"#fff", fontFamily:headingFont, textAlign:"center" }}>{col.title}</div>)}
          {(cols[0]?.items || []).map((_, rowIdx) => (
            <>
              <div key={`r${rowIdx}`} style={{ background:"#fff", padding:"6px 12px", fontSize:"12px", color:textColor, fontFamily:bodyFont }}>{cols[0]?.items?.[rowIdx] || ""}</div>
              {cols.map((col, ci) => <div key={`c${ci}r${rowIdx}`} style={{ background:"#fff", padding:"6px 12px", fontSize:"12px", color:textColor, fontFamily:bodyFont, textAlign:"center" }}>{ci === 0 ? "✓" : (col.items?.[rowIdx] ? "✓" : "—")}</div>)}
            </>
          ))}
        </div>
      </div>
    );
  }

  // Default: column comparison
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols.length}, 1fr)`, gap:"14px", flex:1, width:"100%" }}>
      {cols.map((col, i) => (
        <div key={i} style={{ background:"#FAFBFC", borderRadius:"10px", padding:"16px", border:`1px solid ${V?.border || "#DDE1EB"}` }}>
          <div style={{ fontSize:"16px", fontWeight:700, color:accent, fontFamily:headingFont, marginBottom:"12px", paddingBottom:"8px", borderBottom:`2px solid ${accent}` }}>{col.title}</div>
          {(col.items||[]).map((item, j) => <div key={j} style={{ fontSize:"13px", color:textColor, fontFamily:bodyFont, lineHeight:1.5, display:"flex", gap:"6px", marginBottom:"4px" }}><span style={{ color:accent, fontWeight:700, flexShrink:0 }}>•</span><span>{item}</span></div>)}
        </div>
      ))}
    </div>
  );
};

/** Chart layouts */
const ChartRenderer = ({ slide, style, colors }) => {
  const { accent, textColor, subColor, bodyFont } = colors;
  const data = slide.chartData || [];
  const chartType = style.type || slide.chartType || "bar";

  if (chartType === "pie" || chartType === "donut") {
    const total = data.reduce((s, d) => s + (d.value || 0), 0);
    const isDonut = chartType === "donut";
    let cum = 0;
    return (
      <div style={{ flex:1, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"36px" }}>
        <svg width="180" height="180" viewBox="0 0 200 200">
          {data.map((d, i) => {
            const pct = total > 0 ? d.value / total : 0;
            const start = cum * 2 * Math.PI - Math.PI / 2; cum += pct;
            const end = cum * 2 * Math.PI - Math.PI / 2;
            const r = 90, ir = isDonut ? 50 : 0;
            const x1 = 100+r*Math.cos(start), y1 = 100+r*Math.sin(start);
            const x2 = 100+r*Math.cos(end), y2 = 100+r*Math.sin(end);
            const large = pct > 0.5 ? 1 : 0;
            if (isDonut) {
              const ix1 = 100+ir*Math.cos(end), iy1 = 100+ir*Math.sin(end);
              const ix2 = 100+ir*Math.cos(start), iy2 = 100+ir*Math.sin(start);
              return <path key={i} d={`M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix1},${iy1} A${ir},${ir} 0 ${large},0 ${ix2},${iy2} Z`} fill={CHART_COLORS[i%7]} />;
            }
            return <path key={i} d={`M100,100 L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`} fill={CHART_COLORS[i%7]} />;
          })}
        </svg>
        <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
          {data.map((d, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"12px", color:textColor, fontFamily:bodyFont }}>
              <div style={{ width:10, height:10, borderRadius:2, background:CHART_COLORS[i%7], flexShrink:0 }} />
              <span>{d.label} ({d.value})</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chartType === "horizontal") {
    const maxVal = Math.max(...data.map(d => d.value||0), 1);
    return (
      <div style={{ flex:1, width:"100%", display:"flex", flexDirection:"column", justifyContent:"center", gap:"10px", padding:"0 16px" }}>
        {data.map((d, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ width:"80px", fontSize:"12px", color:subColor, fontFamily:bodyFont, textAlign:"right", flexShrink:0 }}>{d.label}</div>
            <div style={{ flex:1, height:"20px", background:`${accent}10`, borderRadius:"4px", overflow:"hidden" }}>
              <div style={{ width:`${(d.value/maxVal)*100}%`, height:"100%", background:CHART_COLORS[i%7], borderRadius:"4px" }} />
            </div>
            <div style={{ width:"40px", fontSize:"12px", fontWeight:700, color:textColor, fontFamily:bodyFont }}>{d.value}</div>
          </div>
        ))}
      </div>
    );
  }

  if (chartType === "line" || chartType === "area") {
    const maxVal = Math.max(...data.map(d => d.value||0), 1);
    const w = 700, h = 200, pad = 40;
    const pts = data.map((d, i) => ({ x: pad + i * ((w-2*pad)/(data.length-1||1)), y: h - pad - (d.value/maxVal)*(h-2*pad) }));
    const path = pts.map((p, i) => `${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
    return (
      <div style={{ flex:1, width:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <svg width={w} height={h+30} viewBox={`0 0 ${w} ${h+30}`}>
          {chartType === "area" && <path d={`${path} L${pts[pts.length-1]?.x||0},${h-pad} L${pad},${h-pad} Z`} fill={`${accent}15`} />}
          <path d={path} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5" fill={accent} stroke="#fff" strokeWidth="2" />)}
          {data.map((d, i) => <text key={`l${i}`} x={pts[i]?.x} y={h+10} textAnchor="middle" fontSize="11" fill={subColor}>{d.label}</text>)}
        </svg>
      </div>
    );
  }

  // Default: bar chart
  const maxVal = Math.max(...data.map(d => d.value||0), 1);
  return (
    <div style={{ flex:1, width:"100%", display:"flex", alignItems:"flex-end", gap:"10px", paddingTop:"16px", paddingBottom:"4px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", height:"100%" }}>
          <div style={{ fontSize:"12px", fontWeight:700, color:textColor, marginBottom:"4px", fontFamily:bodyFont }}>{d.value}</div>
          <div style={{ width:"65%", borderRadius:"5px 5px 0 0", background:`linear-gradient(180deg, ${CHART_COLORS[i%7]}, ${CHART_COLORS[i%7]}CC)`, height:`${Math.max((d.value/maxVal)*100, 6)}%`, minHeight:"8px" }} />
          <div style={{ fontSize:"10px", color:subColor, marginTop:"4px", textAlign:"center", fontFamily:bodyFont, lineHeight:1.2 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
};

/** Timeline/Process layouts */
const TimelineRenderer = ({ slide, style, colors }) => {
  const { accent, textColor, subColor, headingFont, bodyFont } = colors;
  const steps = slide.steps || [];

  if (style.vertical) {
    return (
      <div style={{ flex:1, width:"100%", paddingLeft:"32px", position:"relative" }}>
        <div style={{ position:"absolute", left:"44px", top:"4px", bottom:"4px", width:"2px", background:`${accent}20` }} />
        {steps.map((step, i) => (
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"16px", marginBottom:"14px", position:"relative" }}>
            <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:accent, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:"13px", flexShrink:0, zIndex:1, boxShadow:`0 2px 6px ${accent}40` }}>{i+1}</div>
            <div style={{ flex:1, paddingTop:"3px" }}>
              <div style={{ fontSize:"15px", fontWeight:700, color:textColor, fontFamily:headingFont }}>{step.label}</div>
              {step.desc && <div style={{ fontSize:"12px", color:subColor, fontFamily:bodyFont, marginTop:"2px" }}>{step.desc}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (style.arrows) {
    return (
      <div style={{ flex:1, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"4px" }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:"4px", flex:1 }}>
            <div style={{ flex:1, background:CHART_COLORS[i%7], borderRadius:"8px", padding:"14px 12px", textAlign:"center", color:"#fff", minHeight:"80px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
              <div style={{ fontSize:"14px", fontWeight:700, fontFamily:headingFont }}>{step.label}</div>
              {step.desc && <div style={{ fontSize:"10px", opacity:0.85, marginTop:"4px", fontFamily:bodyFont }}>{step.desc}</div>}
            </div>
            {i < steps.length - 1 && <div style={{ fontSize:"18px", color:accent, flexShrink:0 }}>▶</div>}
          </div>
        ))}
      </div>
    );
  }

  if (style.roadmap) {
    return (
      <div style={{ flex:1, width:"100%", position:"relative", display:"flex", flexDirection:"column", justifyContent:"center" }}>
        <div style={{ height:"4px", background:`${accent}15`, borderRadius:"2px", margin:"0 40px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:"-14px", padding:"0 20px" }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
              <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:accent, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:"13px", boxShadow:`0 2px 8px ${accent}40`, zIndex:1 }}>{i+1}</div>
              <div style={{ marginTop:"10px", background:`${accent}06`, borderRadius:"8px", padding:"10px 8px", textAlign:"center", width:"100%", border:`1px solid ${accent}12` }}>
                <div style={{ fontSize:"13px", fontWeight:700, color:textColor, fontFamily:headingFont }}>{step.label}</div>
                {step.desc && <div style={{ fontSize:"10px", color:subColor, fontFamily:bodyFont, marginTop:"3px" }}>{step.desc}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (style.milestone) {
    return (
      <div style={{ flex:1, width:"100%", display:"flex", alignItems:"center", position:"relative" }}>
        <div style={{ position:"absolute", top:"50%", left:"30px", right:"30px", height:"3px", background:`${accent}20` }} />
        <div style={{ display:"flex", justifyContent:"space-between", width:"100%", zIndex:1, padding:"0 20px" }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
              <div style={{ fontSize:"11px", color:subColor, fontFamily:bodyFont, marginBottom:"8px" }}>{step.desc || ""}</div>
              <div style={{ width:"16px", height:"16px", borderRadius:"50%", background:accent, border:"3px solid #fff", boxShadow:`0 0 0 2px ${accent}` }} />
              <div style={{ fontSize:"13px", fontWeight:700, color:textColor, fontFamily:headingFont, marginTop:"8px", textAlign:"center" }}>{step.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: horizontal timeline
  return (
    <div style={{ flex:1, width:"100%", display:"flex", alignItems:"center", position:"relative", paddingTop:"12px" }}>
      <div style={{ position:"absolute", top:"50%", left:"36px", right:"36px", height:"3px", background:`${accent}25`, borderRadius:"2px" }} />
      <div style={{ display:"flex", justifyContent:"space-between", width:"100%", position:"relative", zIndex:1 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1, padding:"0 6px" }}>
            <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:accent, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:"14px", fontFamily:headingFont, marginBottom:"10px", boxShadow:`0 2px 8px ${accent}40` }}>{i+1}</div>
            <div style={{ fontSize:"13px", fontWeight:700, color:textColor, fontFamily:headingFont, textAlign:"center", marginBottom:"3px" }}>{step.label}</div>
            {step.desc && <div style={{ fontSize:"10px", color:subColor, fontFamily:bodyFont, textAlign:"center", lineHeight:1.3 }}>{step.desc}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Framework layouts (SWOT, Matrix, Pyramid, Funnel, Cycle) */
const FrameworkRenderer = ({ slide, style, colors }) => {
  const { accent, textColor, subColor, headingFont, bodyFont } = colors;
  const fwType = style.type;

  if (fwType === "swot") {
    const cols = slide.columns || [];
    const labels = ["Strengths","Weaknesses","Opportunities","Threats"];
    const bgColors = ["#E8F5E9","#FFEBEE","#E3F2FD","#FFF3E0"];
    const fgColors = ["#2E7D32","#C83732","#1565C0","#D4880F"];
    return (
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gridTemplateRows:"1fr 1fr", gap:"8px", flex:1, width:"100%" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background:bgColors[i], borderRadius:"10px", padding:"12px", overflow:"hidden" }}>
            <div style={{ fontSize:"13px", fontWeight:800, color:fgColors[i], fontFamily:headingFont, marginBottom:"8px" }}>{cols[i]?.title || labels[i]}</div>
            {(cols[i]?.items||[]).map((item, j) => <div key={j} style={{ fontSize:"11px", color:textColor, fontFamily:bodyFont, padding:"2px 0" }}>• {item}</div>)}
          </div>
        ))}
      </div>
    );
  }

  if (fwType === "matrix") {
    const cols = slide.columns || [];
    return (
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gridTemplateRows:"1fr 1fr", gap:"8px", flex:1, width:"100%" }}>
        {cols.slice(0, 4).map((col, i) => (
          <div key={i} style={{ background:`${CHART_COLORS[i%7]}10`, borderRadius:"10px", padding:"14px", border:`1px solid ${CHART_COLORS[i%7]}25` }}>
            <div style={{ fontSize:"14px", fontWeight:700, color:CHART_COLORS[i%7], fontFamily:headingFont, marginBottom:"8px" }}>{col.title}</div>
            {(col.items||[]).map((item, j) => <div key={j} style={{ fontSize:"12px", color:textColor, fontFamily:bodyFont, padding:"2px 0" }}>• {item}</div>)}
          </div>
        ))}
      </div>
    );
  }

  if (fwType === "pyramid") {
    const items = slide.items || [];
    return (
      <div style={{ flex:1, width:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"4px" }}>
        {items.map((item, i) => {
          const widthPct = 30 + (i * 70 / Math.max(items.length - 1, 1));
          return (
            <div key={i} style={{ width:`${widthPct}%`, background:CHART_COLORS[i%7], borderRadius:"6px", padding:"10px 14px", textAlign:"center", color:"#fff" }}>
              <div style={{ fontSize:"13px", fontWeight:700, fontFamily:headingFont }}>{item.label}</div>
              {item.desc && <div style={{ fontSize:"10px", opacity:0.85, fontFamily:bodyFont }}>{item.desc}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  if (fwType === "funnel") {
    const items = slide.items || [];
    return (
      <div style={{ flex:1, width:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"3px" }}>
        {items.map((item, i) => {
          const widthPct = 95 - (i * 55 / Math.max(items.length - 1, 1));
          return (
            <div key={i} style={{ width:`${widthPct}%`, background:CHART_COLORS[i%7], borderRadius:"6px", padding:"10px 14px", textAlign:"center", color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:"13px", fontWeight:700, fontFamily:headingFont }}>{item.label}</span>
              {item.desc && <span style={{ fontSize:"11px", opacity:0.85, fontFamily:bodyFont }}>{item.desc}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  if (fwType === "cycle") {
    const items = slide.items || [];
    const count = items.length;
    const r = 120;
    return (
      <div style={{ flex:1, width:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width="320" height="300" viewBox="0 0 320 300">
          {items.map((item, i) => {
            const angle = (i * 2 * Math.PI / count) - Math.PI / 2;
            const x = 160 + r * Math.cos(angle);
            const y = 150 + r * Math.sin(angle);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="36" fill={CHART_COLORS[i%7]} />
                <text x={x} y={y-4} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">{item.label}</text>
                {item.desc && <text x={x} y={y+10} textAnchor="middle" fill="#ffffffCC" fontSize="8">{item.desc}</text>}
                {count > 1 && (() => {
                  const nextAngle = ((i+1)%count * 2 * Math.PI / count) - Math.PI / 2;
                  const nx = 160 + (r-44) * Math.cos((angle+nextAngle)/2);
                  const ny = 150 + (r-44) * Math.sin((angle+nextAngle)/2);
                  return <text x={nx} y={ny} textAnchor="middle" fill={accent} fontSize="14" fontWeight="700">→</text>;
                })()}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  return null;
};

/* ══════════════════════════════════════════
   MAIN RENDER FUNCTION
   ══════════════════════════════════════════ */

/**
 * Render slide content based on layout variant.
 * @param {object} slide - Slide data
 * @param {string} layoutId - Layout variant ID (from catalog)
 * @param {object} colors - { accent, textColor, subColor, headingFont, bodyFont, V }
 * @returns JSX element for the content area (below heading)
 */
export function renderLayoutContent(slide, layoutId, colors) {
  const layout = getLayout(normalizeLayoutId(layoutId));
  if (!layout) return null;

  const { base, style } = layout;

  switch (base) {
    case "text":    return <TextRenderer slide={slide} style={style} colors={colors} />;
    case "list":    return <ListRenderer slide={slide} style={style} colors={colors} />;
    case "grid":    return <GridRenderer slide={slide} style={style} colors={colors} />;
    case "columns": return <ColumnsRenderer slide={slide} style={style} colors={colors} />;
    case "chart":   return <ChartRenderer slide={slide} style={style} colors={colors} />;
    case "timeline":return <TimelineRenderer slide={slide} style={style} colors={colors} />;
    case "framework":return <FrameworkRenderer slide={slide} style={style} colors={colors} />;
    default:        return null;
  }
}
