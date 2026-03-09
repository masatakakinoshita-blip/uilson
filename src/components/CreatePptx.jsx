import { useState, useRef, useEffect } from "react";
import { DEFAULT_SLIDES, MODEL_COLORS, MODEL_NAMES, PRESET_TEMPLATES } from "../data/slides";
import { LAYOUT_CATALOG, LAYOUT_CATEGORIES, getLayout, getCompatibleLayouts, normalizeLayoutId } from "../data/layouts";
import { renderLayoutContent } from "./LayoutRenderers";
import { renderPptxLayout } from "./PptxRenderers";

const V = {
  bg:"#F0F2F7", sb:"#FFFFFF", main:"#F5F6FA", card:"#FFFFFF", border:"#DDE1EB",
  border2:"#C8CDD8", t1:"#333333", t2:"#555555", t3:"#888888", t4:"#AAAAAA",
  white:"#FFFFFF", accent:"#3C5996", teal:"#2B4070", navy:"#1E2D50", blue:"#3C5996",
  red:"#C83732", green:"#2E7D32", orange:"#D4880F", lime:"#ABCD00"
};

export default function CreatePptx({ setView }) {
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [curSlide, setCurSlide] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [templateFile, setTemplateFile] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [templateInfo, setTemplateInfo] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [presetId, setPresetId] = useState("default");
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [refFiles, setRefFiles] = useState([]); // {name, content, active, type}
  const [editingField, setEditingField] = useState(null); // track which field is being edited in preview
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const refFileInputRef = useRef(null);
  const templateBufferRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ── Slide update helper ── */
  const updateSlide = (idx, updates) => {
    setSlides(prev => prev.map((sl, i) => i === idx ? { ...sl, ...updates } : sl));
  };
  const updateSlideItem = (slideIdx, itemIdx, field, value) => {
    setSlides(prev => prev.map((sl, i) => {
      if (i !== slideIdx) return sl;
      const items = [...(sl.items || [])];
      items[itemIdx] = { ...items[itemIdx], [field]: value };
      return { ...sl, items };
    }));
  };
  const updateSlideStat = (slideIdx, statIdx, field, value) => {
    setSlides(prev => prev.map((sl, i) => {
      if (i !== slideIdx) return sl;
      const stats = [...(sl.stats || [])];
      stats[statIdx] = { ...stats[statIdx], [field]: value };
      return { ...sl, stats };
    }));
  };
  const updateSlideStep = (slideIdx, stepIdx, field, value) => {
    setSlides(prev => prev.map((sl, i) => {
      if (i !== slideIdx) return sl;
      const steps = [...(sl.steps || [])];
      steps[stepIdx] = { ...steps[stepIdx], [field]: value };
      return { ...sl, steps };
    }));
  };
  const updateSlideColumn = (slideIdx, colIdx, field, value) => {
    setSlides(prev => prev.map((sl, i) => {
      if (i !== slideIdx) return sl;
      const columns = [...(sl.columns || [])];
      if (field === "title") {
        columns[colIdx] = { ...columns[colIdx], title: value };
      } else if (field === "items") {
        columns[colIdx] = { ...columns[colIdx], items: value };
      }
      return { ...sl, columns };
    }));
  };
  const updateSlideChartData = (slideIdx, dataIdx, field, value) => {
    setSlides(prev => prev.map((sl, i) => {
      if (i !== slideIdx) return sl;
      const chartData = [...(sl.chartData || [])];
      chartData[dataIdx] = { ...chartData[dataIdx], [field]: field === "value" ? (Number(value) || 0) : value };
      return { ...sl, chartData };
    }));
  };

  /* ── Template Upload Handlers ── */
  const handleTemplateUpload = async (file) => {
    if (!file || !file.name.match(/\.pptx$/i)) {
      alert("PPTXファイルを選択してください");
      return;
    }
    setTemplateFile(file);
    setTemplateName(file.name);

    // Client-side JSZip parsing for faithful preview
    try {
      await loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
      const buf = await file.arrayBuffer();
      templateBufferRef.current = buf; // preserve for download
      const zip = await window.JSZip.loadAsync(buf);

      // Count slides
      const slideFiles = Object.keys(zip.files)
        .filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/))
        .sort();

      // Extract theme fonts & colors
      let fonts = { heading: null, body: null };
      let colors = {};
      try {
        const themeFile = zip.file("ppt/theme/theme1.xml");
        if (themeFile) {
          const themeXml = await themeFile.async("string");
          const majorEa = themeXml.match(/<a:majorFont>[\s\S]*?<a:ea\s+typeface="([^"]+)"/);
          const minorEa = themeXml.match(/<a:minorFont>[\s\S]*?<a:ea\s+typeface="([^"]+)"/);
          const majorLat = themeXml.match(/<a:majorFont>[\s\S]*?<a:latin\s+typeface="([^"]+)"/);
          const minorLat = themeXml.match(/<a:minorFont>[\s\S]*?<a:latin\s+typeface="([^"]+)"/);
          fonts.heading = majorEa?.[1] || majorLat?.[1] || null;
          fonts.body = minorEa?.[1] || minorLat?.[1] || null;

          const extractColor = (tag) => {
            // First extract the element content within closing tag to avoid cross-element matching
            const elemMatch = themeXml.match(new RegExp(`<a:${tag}>([\\s\\S]*?)</a:${tag}>`, "i"));
            if (!elemMatch) return null;
            const elem = elemMatch[1];
            const srgb = elem.match(/<a:srgbClr val="([^"]+)"/);
            if (srgb) return srgb[1];
            const sys = elem.match(/<a:sysClr[^>]*lastClr="([^"]+)"/);
            if (sys) return sys[1];
            return null;
          };
          ["dk1","dk2","lt1","lt2","accent1","accent2","accent3","accent4","accent5","accent6","hlink"]
            .forEach(tag => { colors[tag] = extractColor(tag); });
        }
      } catch (e) { /* theme parsing optional */ }

      // Helper: resolve image from relationship
      const resolveImage = async (xmlContent, relsContent, basePath) => {
        const bgImg = xmlContent.match(/<p:bg>[\s\S]*?<a:blipFill>[\s\S]*?r:embed="([^"]+)"/);
        if (!bgImg || !relsContent) return null;
        const relId = bgImg[1];
        const target = relsContent.match(new RegExp(`Id="${relId}"[^>]*Target="([^"]+)"`));
        if (!target) return null;
        let imgPath = target[1];
        if (imgPath.startsWith("../")) imgPath = "ppt/" + imgPath.replace("../", "");
        else if (!imgPath.startsWith("ppt/")) imgPath = basePath + imgPath;
        const imgFile = zip.file(imgPath);
        if (!imgFile) return null;
        const imgBuf = await imgFile.async("base64");
        const ext = imgPath.split(".").pop().toLowerCase();
        const mime = ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : "image/jpeg";
        return `data:${mime};base64,${imgBuf}`;
      };

      // Helper: extract bg color from <p:bg> supporting srgbClr, schemeClr, sysClr
      const extractBgColor = (xmlStr) => {
        const bgSection = xmlStr.match(/<p:bg>([\s\S]*?)<\/p:bg>/);
        if (!bgSection) return null;
        const bgContent = bgSection[1];
        // Check solidFill first
        const solidFill = bgContent.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
        if (solidFill) {
          const srgb = solidFill[1].match(/<a:srgbClr val="([^"]+)"/);
          if (srgb) return srgb[1];
          const scheme = solidFill[1].match(/<a:schemeClr val="([^"]+)"/);
          const schemeMap = { bg1:"lt1", bg2:"lt2", tx1:"dk1", tx2:"dk2" };
          if (scheme) {
            const key = schemeMap[scheme[1]] || scheme[1];
            if (colors[key]) return colors[key];
          }
          const sys = solidFill[1].match(/<a:sysClr[^>]*lastClr="([^"]+)"/);
          if (sys) return sys[1];
        }
        // Also check bgRef with schemeClr (e.g. <p:bgRef idx="1001"><a:schemeClr val="bg1"/>)
        const bgRef = bgContent.match(/<p:bgRef[^>]*>([\s\S]*?)<\/p:bgRef>/);
        if (bgRef) {
          const scheme = bgRef[1].match(/<a:schemeClr val="([^"]+)"/);
          const schemeMap = { bg1:"lt1", bg2:"lt2", tx1:"dk1", tx2:"dk2" };
          if (scheme) {
            const key = schemeMap[scheme[1]] || scheme[1];
            if (colors[key]) return colors[key];
          }
        }
        return null;
      };

      // Extract background images from slide masters, layouts, and actual slides
      let backgrounds = { cover: null, content: null, coverColor: null, contentColor: null };
      try {
        // Slide master background
        const masterXml = zip.file("ppt/slideMasters/slideMaster1.xml");
        const masterRels = zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels");
        if (masterXml) {
          const mc = await masterXml.async("string");
          const mr = masterRels ? await masterRels.async("string") : null;
          const img = await resolveImage(mc, mr, "ppt/slideMasters/");
          if (img) backgrounds.content = img;
          if (!img) {
            const bgc = extractBgColor(mc);
            if (bgc) backgrounds.contentColor = bgc;
          }
        }

        // First slide layout (cover)
        const layout1 = zip.file("ppt/slideLayouts/slideLayout1.xml");
        const layout1Rels = zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels");
        if (layout1) {
          const lc = await layout1.async("string");
          const lr = layout1Rels ? await layout1Rels.async("string") : null;
          const img = await resolveImage(lc, lr, "ppt/slideLayouts/");
          if (img) backgrounds.cover = img;
          if (!img) {
            const bgc = extractBgColor(lc);
            if (bgc) backgrounds.coverColor = bgc;
          }
        }

        // Actual slides (first = cover, second = content)
        for (let i = 0; i < Math.min(slideFiles.length, 2); i++) {
          const sf = zip.file(slideFiles[i]);
          const srPath = slideFiles[i].replace("slides/", "slides/_rels/").replace(".xml", ".xml.rels");
          const sr = zip.file(srPath);
          if (!sf) continue;
          const sc = await sf.async("string");
          const srels = sr ? await sr.async("string") : null;
          const img = await resolveImage(sc, srels, "ppt/slides/");
          if (img) {
            if (i === 0 && !backgrounds.cover) backgrounds.cover = img;
            else if (i === 1 && !backgrounds.content) backgrounds.content = img;
          }
          if (!img) {
            const bgc = extractBgColor(sc);
            if (bgc) {
              if (i === 0 && !backgrounds.cover && !backgrounds.coverColor) backgrounds.coverColor = bgc;
              else if (i === 1 && !backgrounds.content && !backgrounds.contentColor) backgrounds.contentColor = bgc;
            }
          }
        }
      } catch (e) {
        console.log("bg extraction:", e.message);
      }

      // Extract visual elements (shapes, images, gradients) from slide masters, layouts & slides
      const EMU_W = 12192000, EMU_H = 6858000;

      // Resolve any color reference (srgbClr, schemeClr, sysClr) to hex
      const resolveColor = (xmlFragment) => {
        const srgb = xmlFragment.match(/<a:srgbClr val="([^"]+)"/);
        if (srgb) return srgb[1];
        const scheme = xmlFragment.match(/<a:schemeClr val="([^"]+)"/);
        if (scheme && colors[scheme[1]]) return colors[scheme[1]];
        // Map scheme names to theme color keys
        const schemeMap = { bg1:"lt1", bg2:"lt2", tx1:"dk1", tx2:"dk2" };
        if (scheme && schemeMap[scheme[1]] && colors[schemeMap[scheme[1]]]) return colors[schemeMap[scheme[1]]];
        const sys = xmlFragment.match(/<a:sysClr[^>]*lastClr="([^"]+)"/);
        if (sys) return sys[1];
        return null;
      };

      // Extract alpha from a fill section
      const extractAlpha = (xmlFragment) => {
        const a = xmlFragment.match(/<a:alpha val="(\d+)"/);
        return a ? parseInt(a[1]) / 100000 : 1;
      };

      const parseVisuals = async (xmlStr, relsStr, bPath) => {
        const elems = [];
        // Shapes with fills - only extract fill from <p:spPr> (shape properties),
        // NOT from text run properties (<a:rPr>) which contain text color, not shape fill
        const spRx = /<p:sp\b[\s\S]*?<\/p:sp>/g;
        let m;
        while ((m = spRx.exec(xmlStr)) !== null) {
          const sp = m[0];
          if (sp.includes("<p:ph")) continue; // skip text placeholders
          // Skip shapes that contain text body with actual text content (text boxes)
          const txBody = sp.match(/<p:txBody>([\s\S]*?)<\/p:txBody>/);
          if (txBody) {
            const textContent = txBody[1].replace(/<[^>]+>/g, "").trim();
            if (textContent.length > 0) continue; // has visible text → skip (it's a text box, not a decoration)
          }
          const off = sp.match(/<a:off x="(\d+)" y="(\d+)"/);
          const ex = sp.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
          if (!off || !ex) continue;
          const x = parseInt(off[1])/EMU_W*100, y = parseInt(off[2])/EMU_H*100;
          const w = parseInt(ex[1])/EMU_W*100, h = parseInt(ex[2])/EMU_H*100;
          if (w < 0.3 && h < 0.3) continue;

          // Only look for fill inside <p:spPr> (shape properties), not entire shape
          const spPr = sp.match(/<p:spPr\b[^>]*>([\s\S]*?)<\/p:spPr>/);
          if (!spPr) continue;
          const spPrContent = spPr[1];

          // Solid fill (srgbClr, schemeClr, or sysClr) - from shape properties only
          const solidFill = spPrContent.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
          if (solidFill) {
            const color = resolveColor(solidFill[1]);
            if (color) {
              const opacity = extractAlpha(solidFill[1]);
              elems.push({ type:"rect", x, y, w, h, fill:`#${color}`, opacity });
              continue;
            }
          }

          // Gradient fill (supports both srgbClr and schemeClr) - from shape properties only
          const gradSection = spPrContent.match(/<a:gradFill>([\s\S]*?)<\/a:gradFill>/);
          if (gradSection) {
            const stops = [];
            const gsRx = /<a:gs pos="(\d+)">([\s\S]*?)<\/a:gs>/g;
            let gs;
            while ((gs = gsRx.exec(gradSection[1])) !== null) {
              const color = resolveColor(gs[2]);
              if (color) stops.push({ pos: parseInt(gs[1])/1000, color: `#${color}` });
            }
            if (stops.length >= 2) {
              const grad = `linear-gradient(180deg, ${stops.map(s=>`${s.color} ${s.pos}%`).join(", ")})`;
              elems.push({ type:"rect", x, y, w, h, fill: grad, opacity: 1 });
            }
          }
        }
        // Group shapes (spTree inside grpSp may contain shapes)
        const grpRx = /<p:grpSp\b[\s\S]*?<\/p:grpSp>/g;
        while ((m = grpRx.exec(xmlStr)) !== null) {
          const grp = m[0];
          // Recursively find shapes in groups
          const innerSpRx = /<p:sp\b[\s\S]*?<\/p:sp>/g;
          let innerM;
          while ((innerM = innerSpRx.exec(grp)) !== null) {
            const sp = innerM[0];
            if (sp.includes("<p:ph")) continue;
            // Skip text boxes in groups too
            const txB = sp.match(/<p:txBody>([\s\S]*?)<\/p:txBody>/);
            if (txB) { const tc = txB[1].replace(/<[^>]+>/g, "").trim(); if (tc.length > 0) continue; }
            const off = sp.match(/<a:off x="(\d+)" y="(\d+)"/);
            const ex = sp.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
            if (!off || !ex) continue;
            const x = parseInt(off[1])/EMU_W*100, y = parseInt(off[2])/EMU_H*100;
            const w = parseInt(ex[1])/EMU_W*100, h = parseInt(ex[2])/EMU_H*100;
            if (w < 0.3 && h < 0.3) continue;
            // Only look in spPr for fill
            const grpSpPr = sp.match(/<p:spPr\b[^>]*>([\s\S]*?)<\/p:spPr>/);
            if (!grpSpPr) continue;
            const solidFill = grpSpPr[1].match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
            if (solidFill) {
              const color = resolveColor(solidFill[1]);
              if (color) {
                elems.push({ type:"rect", x, y, w, h, fill:`#${color}`, opacity: extractAlpha(solidFill[1]) });
              }
            }
          }
        }
        // Pictures
        const picRx = /<p:pic\b[\s\S]*?<\/p:pic>/g;
        while ((m = picRx.exec(xmlStr)) !== null) {
          const pic = m[0];
          const off = pic.match(/<a:off x="(\d+)" y="(\d+)"/);
          const ex = pic.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
          const emb = pic.match(/r:embed="([^"]+)"/);
          if (!off || !ex || !emb || !relsStr) continue;
          const x = parseInt(off[1])/EMU_W*100, y = parseInt(off[2])/EMU_H*100;
          const w = parseInt(ex[1])/EMU_W*100, h = parseInt(ex[2])/EMU_H*100;
          const rId = emb[1];
          const tgt = relsStr.match(new RegExp(`Id="${rId}"[^>]*Target="([^"]+)"`));
          if (!tgt) continue;
          let iP = tgt[1];
          if (iP.startsWith("../")) iP = "ppt/" + iP.replace(/^\.\.\//g, "");
          else if (!iP.startsWith("ppt/")) iP = bPath + iP;
          const iF = zip.file(iP);
          if (!iF) continue;
          const iD = await iF.async("base64");
          const iE = iP.split(".").pop().toLowerCase();
          const iM = iE==="png"?"image/png":iE==="svg"?"image/svg+xml":"image/jpeg";
          elems.push({ type:"img", x, y, w, h, src:`data:${iM};base64,${iD}` });
        }
        return elems;
      };

      let coverElements = [], contentElements = [];
      try {
        // Collect elements from master → layout → actual slides (layered)
        let masterElems = [];
        const mf = zip.file("ppt/slideMasters/slideMaster1.xml");
        const mfr = zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels");
        if (mf) {
          const mx = await mf.async("string");
          const mr2 = mfr ? await mfr.async("string") : null;
          masterElems = await parseVisuals(mx, mr2, "ppt/slideMasters/");
        }
        // Layout 1 = title/cover
        const l1f = zip.file("ppt/slideLayouts/slideLayout1.xml");
        const l1r = zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels");
        if (l1f) {
          const l1x = await l1f.async("string");
          const l1rels = l1r ? await l1r.async("string") : null;
          coverElements = [...masterElems, ...await parseVisuals(l1x, l1rels, "ppt/slideLayouts/")];
        } else coverElements = [...masterElems];
        // Layout 2 = content
        const l2f = zip.file("ppt/slideLayouts/slideLayout2.xml");
        const l2r = zip.file("ppt/slideLayouts/_rels/slideLayout2.xml.rels");
        if (l2f) {
          const l2x = await l2f.async("string");
          const l2rels = l2r ? await l2r.async("string") : null;
          contentElements = [...masterElems, ...await parseVisuals(l2x, l2rels, "ppt/slideLayouts/")];
        } else contentElements = [...masterElems];

        // Also extract elements from actual slides (many templates put decorations here)
        for (let i = 0; i < Math.min(slideFiles.length, 2); i++) {
          const sf = zip.file(slideFiles[i]);
          const srPath = slideFiles[i].replace("slides/", "slides/_rels/").replace(".xml", ".xml.rels");
          const sr = zip.file(srPath);
          if (!sf) continue;
          const sc = await sf.async("string");
          const srels = sr ? await sr.async("string") : null;
          const slideElems = await parseVisuals(sc, srels, "ppt/slides/");
          if (slideElems.length > 0) {
            if (i === 0) coverElements = [...coverElements, ...slideElems];
            else contentElements = [...contentElements, ...slideElems];
          }
        }
      } catch (e) {
        console.log("shape extraction:", e.message);
      }

      const info = {
        slideCount: slideFiles.length,
        fonts,
        colors,
        backgrounds,
        coverElements,
        contentElements,
      };
      console.log("Template parsed:", JSON.stringify({
        slideCount: info.slideCount,
        colorKeys: Object.keys(info.colors),
        coverBg: info.backgrounds.coverColor,
        contentBg: info.backgrounds.contentColor,
        coverElCount: info.coverElements.length,
        contentElCount: info.contentElements.length,
        coverEls: info.coverElements.map(e => ({type:e.type, fill:e.fill?.substring(0,20), x:e.x?.toFixed(1), y:e.y?.toFixed(1), w:e.w?.toFixed(1), h:e.h?.toFixed(1)})),
        contentEls: info.contentElements.map(e => ({type:e.type, fill:e.fill?.substring(0,20), x:e.x?.toFixed(1), y:e.y?.toFixed(1), w:e.w?.toFixed(1), h:e.h?.toFixed(1)})),
      }));
      setTemplateInfo(info);
    } catch (e) {
      console.error("Template parse error:", e.message, e.stack);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleTemplateUpload(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const removeTemplate = () => {
    setTemplateFile(null);
    setTemplateName("");
    setTemplateInfo(null);
    templateBufferRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Reference File Handlers ── */
  const handleRefFileUpload = async (files) => {
    const newFiles = [];
    for (const file of files) {
      const ext = file.name.split(".").pop().toLowerCase();
      let content = "";
      try {
        if (["txt","md","csv","tsv","json","xml","html","css","js","py","yaml","yml","log"].includes(ext)) {
          content = await file.text();
          if (content.length > 15000) content = content.slice(0, 15000) + "\n...(以下省略)";
        } else if (["pdf"].includes(ext)) {
          content = `[PDFファイル: ${file.name} (${(file.size/1024).toFixed(0)}KB)]`;
        } else if (ext === "pptx") {
          // Also handle as template
          handleTemplateUpload(file);
          content = `[PPTXテンプレート: ${file.name}]`;
        } else if (["xlsx","xls"].includes(ext)) {
          content = `[Excelファイル: ${file.name} (${(file.size/1024).toFixed(0)}KB)]`;
        } else if (["png","jpg","jpeg","gif","svg"].includes(ext)) {
          content = `[画像: ${file.name}]`;
        } else {
          content = `[ファイル: ${file.name} (${(file.size/1024).toFixed(0)}KB)]`;
        }
      } catch (e) {
        content = `[読み込みエラー: ${file.name}]`;
      }
      newFiles.push({ name: file.name, content, active: true, type: ext, size: file.size });
    }
    setRefFiles(prev => [...prev, ...newFiles]);
  };

  const toggleRefFile = (idx) => {
    setRefFiles(prev => prev.map((f, i) => i === idx ? { ...f, active: !f.active } : f));
  };

  const removeRefFile = (idx) => {
    setRefFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const getRefContext = () => {
    const active = refFiles.filter(f => f.active && f.content);
    if (active.length === 0) return "";
    return "\n\n【参考資料】\n" + active.map(f => `--- ${f.name} ---\n${f.content}`).join("\n\n");
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || generating) return;

    const refContext = getRefContext();
    const userMsg = { role: "user", content: text };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setGenerating(true);

    // ── Per-slide editing mode: when slides already generated, update only current slide ──
    if (generated && slides.length > 0) {
      const targetSlide = slides[curSlide];
      const slideJson = JSON.stringify(targetSlide, null, 2);
      const editPrompt = [
        { role: "user", content: `以下のスライド(ID: ${targetSlide.id}, ${targetSlide.heading || targetSlide.title})を修正してください。\n\n現在のスライドデータ:\n${slideJson}\n\nユーザーの修正指示: ${text}${refContext}\n\nこのスライドのみを修正し、同じJSON構造で1枚だけ返してください。slidesの配列に1要素だけ入れて返してください。` }
      ];

      try {
        const res = await fetch("/api/generate-slides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: editPrompt, mode: "single" })
        });
        const data = await res.json();

        if (data.error) {
          setChatMessages(prev => [...prev, { role: "assistant", content: "エラー: " + data.error }]);
        } else if (data.slides && data.slides.length > 0) {
          const updatedSlide = { ...data.slides[0], id: targetSlide.id, layoutVariant: targetSlide.layoutVariant };
          setSlides(prev => prev.map((sl, idx) => idx === curSlide ? updatedSlide : sl));
          setChatMessages(prev => [...prev, {
            role: "assistant",
            content: `スライド${targetSlide.id}「${updatedSlide.heading || updatedSlide.title}」を更新しました。`
          }]);
        } else if (data.rawText) {
          setChatMessages(prev => [...prev, { role: "assistant", content: data.rawText }]);
        }
      } catch (err) {
        setChatMessages(prev => [...prev, { role: "assistant", content: "更新エラー: " + err.message }]);
      }
      setGenerating(false);
      return;
    }

    // ── Full generation mode (first time) ──
    // Build messages for API - inject ref context into first user message
    const apiMessages = newMessages.map((m, i) => {
      if (i === 0 && m.role === "user" && refContext) {
        return { ...m, content: m.content + refContext };
      }
      return m;
    });

    try {
      const res = await fetch("/api/generate-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, mode: "full" })
      });
      const data = await res.json();

      if (data.error) {
        setChatMessages(prev => [...prev, { role: "assistant", content: "エラー: " + data.error }]);
      } else if (data.slides && data.slides.length > 0) {
        setSlides(data.slides);
        setCurSlide(0);
        setGenerated(true);
        setPreviewing(false);
        const summary = data.summary || `${data.slides.length}枚のスライドを生成しました。`;
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: `${summary}\n\n構成パネルで各スライドの内容を直接編集できます。\nスライドを選択してチャットすると、そのスライドだけ更新できます。\n内容OKなら「PPTプレビュー」で確認→編集もできます。`
        }]);
      } else if (data.rawText) {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.rawText }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "エラー: " + err.message }]);
    }
    setGenerating(false);
  };

  const regenerate = async () => {
    if (generating || chatMessages.length === 0) return;
    const regenMessages = [...chatMessages, { role: "user", content: "スライドを再生成してください。別のアプローチや表現で作り直してください。" }];
    setChatMessages(regenMessages);
    setGenerating(true);

    try {
      const res = await fetch("/api/generate-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: regenMessages, mode: "full" })
      });
      const data = await res.json();

      if (data.slides && data.slides.length > 0) {
        setSlides(data.slides);
        setCurSlide(0);
        setGenerated(true);
        setPreviewing(false);
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: `再生成しました（${data.slides.length}枚）。構成パネルで確認してください。`
        }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "再生成エラー: " + err.message }]);
    }
    setGenerating(false);
  };

  /* ── Load CDN Script Helper ── */
  const loadScript = (src) => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      // If already loaded and global is available, resolve immediately
      if (existing.dataset.loaded === "1") return resolve();
      // If failed before, remove and retry
      if (existing.dataset.loaded === "0") existing.remove();
      else return resolve(); // still loading or done
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => { s.dataset.loaded = "1"; resolve(); };
    s.onerror = () => { s.dataset.loaded = "0"; reject(new Error("Script load failed: " + src)); };
    document.head.appendChild(s);
  });

  /* ── Download: Template-based or PptxGenJS ── */
  const downloadPptx = async () => {
    if (downloading || !generated || slides.length < 2) return;
    setDownloading(true);

    try {
      if (templateFile) {
        // ── Template-based generation using PptxGenJS + template theme ──
        await loadScript("https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js");

        // Use stored buffer (saved during upload) or re-read file
        let templateBuf = templateBufferRef.current;
        if (!templateBuf) {
          templateBuf = await templateFile.arrayBuffer();
          templateBufferRef.current = templateBuf;
        }
        // JSZip might come from PptxGenJS bundle or standalone
        const JSZipLib = window.JSZip;
        if (!JSZipLib) throw new Error("JSZip not available");
        const zip = await JSZipLib.loadAsync(templateBuf);

        // Count existing slides in template
        const slideFiles = Object.keys(zip.files).filter(
          f => f.match(/^ppt\/slides\/slide\d+\.xml$/)
        ).sort();
        const templateSlideCount = slideFiles.length;

        // Strategy: Use PptxGenJS but apply template's theme colors & fonts
        // by extracting theme info from the template
        let themeColors = null;
        let themeFonts = { heading: "Yu Gothic", body: "Yu Gothic" };
        try {
          const themeFile = zip.file("ppt/theme/theme1.xml");
          if (themeFile) {
            const themeXml = await themeFile.async("string");
            // Extract major/minor font
            const majorMatch = themeXml.match(/<a:majorFont>[\s\S]*?<a:ea\s+typeface="([^"]+)"/);
            const minorMatch = themeXml.match(/<a:minorFont>[\s\S]*?<a:ea\s+typeface="([^"]+)"/);
            if (majorMatch) themeFonts.heading = majorMatch[1];
            if (minorMatch) themeFonts.body = minorMatch[1];

            // Extract scheme colors
            const dk1 = themeXml.match(/<a:dk1>[\s\S]*?<a:srgbClr val="([^"]+)"/);
            const dk2 = themeXml.match(/<a:dk2>[\s\S]*?<a:srgbClr val="([^"]+)"/);
            const lt1 = themeXml.match(/<a:lt1>[\s\S]*?<a:srgbClr val="([^"]+)"/);
            const accent1 = themeXml.match(/<a:accent1>[\s\S]*?<a:srgbClr val="([^"]+)"/);
            themeColors = {
              dk1: dk1?.[1] || "1E2D50",
              dk2: dk2?.[1] || "2B4070",
              lt1: lt1?.[1] || "FFFFFF",
              accent1: accent1?.[1] || "3C5996"
            };
          }
        } catch (e) { /* theme extraction optional */ }

        // Generate new PPTX using theme from template
        const pptx = new window.PptxGenJS();
        pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
        pptx.layout = "WIDE";

        const headingFont = themeFonts.heading;
        const bodyFont = themeFonts.body;
        const coverBg = themeColors ? themeColors.dk1 : "1E2D50";
        const closingBg = themeColors ? themeColors.dk2 : "2B4070";
        const accentColor = themeColors ? themeColors.accent1 : "3C5996";

        for (const s of slides) {
          const pptSlide = pptx.addSlide();
          const isCoverClose = s.layout === "cover" || s.layout === "closing";

          let bgColor;
          if (isCoverClose) {
            bgColor = s.layout === "cover" ? coverBg : closingBg;
          } else {
            bgColor = (s.bg || "#FFFFFF").replace("#", "");
          }
          pptSlide.background = { color: bgColor };

          const textColor = (isCoverClose || s.light) ? "FFFFFF" : "333333";
          const subColor = (isCoverClose || s.light) ? "CCCCCC" : "888888";

          if (isCoverClose) {
            pptSlide.addText(s.heading || s.title, {
              x: 0.5, y: 2.0, w: 12.33, h: 1.5,
              fontSize: 36, fontFace: headingFont,
              color: textColor, bold: true, align: "center"
            });
            if (s.sub) {
              pptSlide.addText(s.sub, {
                x: 0.5, y: 3.8, w: 12.33, h: 0.8,
                fontSize: 18, fontFace: bodyFont,
                color: subColor, align: "center"
              });
            }
            if (s.note) {
              pptSlide.addText(s.note, {
                x: 9, y: 6.5, w: 4, h: 0.5,
                fontSize: 10, fontFace: bodyFont,
                color: subColor, align: "right"
              });
            }
          } else {
            // Common heading for template path
            pptSlide.addShape("rect", {
              x: 0.5, y: 1.15, w: 1.5, h: 0.04, fill: { color: accentColor }
            });
            pptSlide.addText(s.heading || s.title, {
              x: 0.5, y: 0.3, w: 12.33, h: 0.85,
              fontSize: 28, fontFace: headingFont, color: textColor, bold: true
            });
            if (s.sub) {
              pptSlide.addText(s.sub, {
                x: 0.5, y: 1.3, w: 12.33, h: 0.5,
                fontSize: 13, fontFace: bodyFont, color: subColor
              });
            }
            const cY = s.sub ? 2.0 : 1.5;

            // Layout-specific content (template path) — 45+ variants via PptxRenderers
            renderPptxLayout(pptSlide, s, s.layoutVariant || normalizeLayoutId(s.layout), cY, {
              hFont: headingFont, bFont: bodyFont, accent: accentColor, textColor, subColor
            });
          }
        }

        await pptx.writeFile({ fileName: "UILSON_presentation.pptx" });

      } else {
        // ── Default: No uploaded template, use preset style with PptxGenJS ──
        await loadScript("https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js");

        const pptx = new window.PptxGenJS();
        pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
        pptx.layout = "WIDE";

        const hFont = preset.headingFont.split(",")[0].trim();
        const bFont = preset.bodyFont.split(",")[0].trim();
        const pCoverBg = preset.coverBg.replace("#", "");
        const pClosingBg = preset.closingBg.replace("#", "");
        const pContentBg = preset.contentBg.replace("#", "");
        const pAccent = preset.accent.replace("#", "");
        const pTextDark = preset.textDark.replace("#", "");

        for (const s of slides) {
          const pptSlide = pptx.addSlide();
          const isCoverClose = s.layout === "cover" || s.layout === "closing";
          const bgColor = isCoverClose
            ? (s.layout === "cover" ? pCoverBg : pClosingBg)
            : pContentBg;
          pptSlide.background = { color: bgColor };
          const textColor = (isCoverClose || s.light) ? "FFFFFF" : pTextDark;
          const subColor = (isCoverClose || s.light) ? "CCCCCC" : "888888";

          if (isCoverClose) {
            // Accent bar for left-aligned covers
            if (preset.coverAlign === "left") {
              pptSlide.addShape("rect", {
                x: 0.5, y: 1.8, w: 1.0, h: 0.05, fill: { color: pAccent }
              });
            }
            pptSlide.addText(s.heading || s.title, {
              x: 0.5, y: 2.0, w: 12.33, h: 1.5,
              fontSize: parseInt(preset.headingSizeCover), fontFace: hFont,
              color: textColor, bold: true, align: preset.coverAlign
            });
            if (s.sub) {
              pptSlide.addText(s.sub, {
                x: 0.5, y: 3.8, w: 12.33, h: 0.8,
                fontSize: 18, fontFace: bFont,
                color: subColor, align: preset.coverAlign
              });
            }
            if (s.note) {
              pptSlide.addText(s.note, {
                x: 9, y: 6.5, w: 4, h: 0.5,
                fontSize: 10, fontFace: bFont,
                color: subColor, align: "right"
              });
            }
          } else {
            // Common heading area for all content layouts
            const barW = preset.accentBarWidth === "100%" ? 12.33 : 1.5;
            pptSlide.addShape("rect", {
              x: 0.5, y: 1.15, w: barW, h: 0.04, fill: { color: pAccent }
            });
            pptSlide.addText(s.heading || s.title, {
              x: 0.5, y: 0.3, w: 12.33, h: 0.85,
              fontSize: parseInt(preset.headingSizeContent), fontFace: hFont,
              color: textColor, bold: true
            });
            const subY = 1.3;
            if (s.sub) {
              pptSlide.addText(s.sub, {
                x: 0.5, y: subY, w: 12.33, h: 0.5,
                fontSize: 13, fontFace: bFont, color: subColor
              });
            }
            const contentY = s.sub ? 2.0 : 1.5;

            // === Layout-specific PPTX content — 45+ variants via PptxRenderers ===
            renderPptxLayout(pptSlide, s, s.layoutVariant || normalizeLayoutId(s.layout), contentY, {
              hFont, bFont, accent: pAccent, textColor, subColor
            });
          }
        }

        await pptx.writeFile({ fileName: "UILSON_presentation.pptx" });
      }
    } catch (err) {
      console.error("Download error:", err);
      alert("ダウンロードエラー: " + (err?.message || String(err)));
    }
    setDownloading(false);
  };

  const slide = slides[curSlide] || slides[0];

  /* ── Template theme helpers for preview ── */
  const tColors = templateInfo?.colors || {};
  const tFonts = templateInfo?.fonts || {};
  const tBgs = templateInfo?.backgrounds || {};
  const preset = PRESET_TEMPLATES.find(p => p.id === presetId) || PRESET_TEMPLATES[0];

  // Derive preview colors: uploaded template > preset > defaults
  const tmCoverBg = templateFile
    ? (tBgs.coverColor ? `#${tBgs.coverColor}` : tColors.dk1 ? `#${tColors.dk1}` : preset.coverBg)
    : (preset.preview.coverGrad || preset.coverBg);
  const tmContentBg = templateFile
    ? (tBgs.contentColor ? `#${tBgs.contentColor}` : tColors.lt1 ? `#${tColors.lt1}` : preset.contentBg)
    : preset.contentBg;
  const tmAccent = templateFile
    ? (tColors.accent1 ? `#${tColors.accent1}` : preset.accent)
    : preset.accent;
  const tmTextDark = templateFile
    ? (tColors.dk1 ? `#${tColors.dk1}` : preset.textDark)
    : preset.textDark;
  const tmTextLight = templateFile
    ? (tColors.lt1 ? `#${tColors.lt1}` : preset.textLight)
    : preset.textLight;
  const tmSubDark = templateFile
    ? (tColors.dk2 ? `#${tColors.dk2}` : preset.subDark)
    : preset.subDark;
  const tmHeadingFont = templateFile
    ? (tFonts.heading || preset.headingFont)
    : preset.headingFont;
  const tmBodyFont = templateFile
    ? (tFonts.body || preset.bodyFont)
    : preset.bodyFont;

  // Get bg style for a slide depending on template/preset
  const getPreviewBg = (s) => {
    const isCoverClose = s.layout === "cover" || s.layout === "closing";
    if (templateFile && isCoverClose) {
      if (tBgs.cover) return { backgroundImage: `url(${tBgs.cover})`, backgroundSize: "cover", backgroundPosition: "center" };
      return { background: tmCoverBg };
    }
    if (templateFile && !isCoverClose) {
      if (tBgs.content) return { backgroundImage: `url(${tBgs.content})`, backgroundSize: "cover", backgroundPosition: "center" };
      return { background: tmContentBg };
    }
    // Preset template (no uploaded file)
    if (isCoverClose) {
      return { background: s.layout === "closing" ? preset.closingBg : tmCoverBg };
    }
    return { background: tmContentBg };
  };

  // Get text color for preview
  const getPreviewTextColor = (s) => {
    const isCoverClose = s.layout === "cover" || s.layout === "closing";
    if (isCoverClose || s.light) return tmTextLight;
    return tmTextDark;
  };

  const getPreviewSubColor = (s) => {
    const isCoverClose = s.layout === "cover" || s.layout === "closing";
    if (isCoverClose || s.light) return preset.subLight;
    return tmSubDark;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: V.main }}>
      {/* Top Bar */}
      <div style={{
        padding: "16px 24px",
        borderBottom: `1px solid ${V.border}`,
        background: V.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
          <button
            onClick={() => setView("create-menu")}
            style={{
              padding: "8px 14px", borderRadius: 6,
              border: `1px solid ${V.border}`, background: V.white,
              cursor: "pointer", fontSize: 14, color: V.t2, fontWeight: 500,
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = V.main}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = V.white}
          >
            ← 作るメニュー
          </button>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: V.t1, margin: 0 }}>
            📊 プレゼン資料を作る
          </h1>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={() => setPreviewing(true)}
            disabled={!generated}
            style={{
              padding: "8px 16px", borderRadius: 6,
              border: `1px solid ${generated ? V.accent : V.border}`,
              background: !generated ? V.main : previewing ? `${V.accent}15` : V.white,
              cursor: !generated ? "not-allowed" : "pointer",
              fontSize: 13, color: generated ? V.accent : V.t4, fontWeight: 600,
              opacity: !generated ? 0.5 : 1,
              transition: "all 0.2s"
            }}
          >
            👁️ PPTプレビュー
          </button>
          <button
            onClick={downloadPptx}
            disabled={downloading || !generated}
            style={{
              padding: "8px 16px", borderRadius: 6,
              border: `1px solid ${generated ? V.green : V.border}`,
              background: !generated ? V.main : `${V.green}10`,
              cursor: (!generated || downloading) ? "not-allowed" : "pointer",
              fontSize: 13, color: generated ? V.green : V.t4, fontWeight: 600,
              opacity: !generated ? 0.5 : 1,
              transition: "all 0.2s"
            }}
          >
            {downloading ? "⏳ 生成中..." : "📥 ダウンロード"}
          </button>
          <button
            onClick={regenerate}
            disabled={generating || chatMessages.length === 0}
            style={{
              padding: "8px 16px", borderRadius: 6,
              border: `1px solid ${V.border}`,
              background: generating ? V.main : V.white,
              cursor: generating ? "wait" : "pointer",
              fontSize: 13, color: V.t2, fontWeight: 500,
              opacity: chatMessages.length === 0 ? 0.5 : 1,
              transition: "all 0.2s"
            }}
          >
            🔄 再生成
          </button>
        </div>
      </div>

      {/* Main Content - 3 Panels */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", gap: 0 }}>

        {/* Left: Chat (30%) */}
        <div style={{
          flex: "0 0 30%",
          borderRight: `1px solid ${V.border}`,
          display: "flex", flexDirection: "column",
          background: V.card, overflow: "hidden"
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${V.border}`,
            fontSize: "12px", fontWeight: 600, color: V.t3,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span>💬 チャット</span>
            {generated && (
              <span style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"10px", background:`${V.accent}12`, color:V.accent, fontWeight:600 }}>
                スライド{slides[curSlide]?.id || curSlide+1}を編集中
              </span>
            )}
          </div>

          {/* ── Reference File Upload Area (NotebookLM style) ── */}
          <div style={{
            padding: "8px 12px",
            borderBottom: `1px solid ${V.border}`,
            background: V.main
          }}>
            <input
              ref={refFileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.tsv,.json,.xml,.html,.pdf,.pptx,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.svg,.yaml,.yml,.log,.py,.js,.css"
              style={{ display: "none" }}
              onChange={e => { if (e.target.files?.length) handleRefFileUpload(Array.from(e.target.files)); }}
            />
            <div
              onClick={() => refFileInputRef.current?.click()}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) handleRefFileUpload(Array.from(e.dataTransfer.files)); }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{
                border: `1px dashed ${dragOver ? V.accent : V.border2}`,
                borderRadius: "6px",
                padding: "8px",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? `${V.accent}08` : "transparent",
                transition: "all 0.2s"
              }}
            >
              <div style={{ fontSize: "10px", color: V.t4, lineHeight: 1.5 }}>
                📎 参考資料をアップロード（複数可）
              </div>
            </div>

            {/* Uploaded reference files with checkboxes */}
            {refFiles.length > 0 && (
              <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                {refFiles.map((rf, idx) => (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "4px 8px", borderRadius: "5px",
                    background: rf.active ? `${V.accent}08` : V.white,
                    border: `1px solid ${rf.active ? `${V.accent}30` : V.border}`,
                    fontSize: "10px"
                  }}>
                    <input
                      type="checkbox"
                      checked={rf.active}
                      onChange={() => toggleRefFile(idx)}
                      style={{ margin: 0, cursor: "pointer", accentColor: V.accent }}
                    />
                    <span style={{
                      flex: 1, color: rf.active ? V.t1 : V.t4,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      fontWeight: rf.active ? 500 : 400
                    }}>
                      {rf.type === "pptx" ? "📊" : rf.type === "csv" || rf.type === "xlsx" ? "📈" : rf.type === "pdf" ? "📄" : "📝"} {rf.name}
                    </span>
                    <span style={{ color: V.t4, fontSize: "9px", flexShrink: 0 }}>
                      {(rf.size / 1024).toFixed(0)}KB
                    </span>
                    <button
                      onClick={() => removeRefFile(idx)}
                      style={{
                        border: "none", background: "none", cursor: "pointer",
                        fontSize: "11px", color: V.t4, padding: "0 2px", lineHeight: 1
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = V.red}
                      onMouseLeave={e => e.currentTarget.style.color = V.t4}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{
            flex: 1, overflowY: "auto", padding: "12px",
            display: "flex", flexDirection: "column", gap: "8px"
          }}>
            {chatMessages.length === 0 && (
              <div style={{
                padding: "20px", textAlign: "center", color: V.t4, fontSize: "12px",
                lineHeight: 1.6
              }}>
                プレゼン資料の内容を入力してください。<br/>
                例: 「営業チーム向けの月次報告を8枚で作って」<br/>
                例: 「新製品発表のプレゼンを作って」
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  padding: "10px", borderRadius: "8px",
                  background: msg.role === "user" ? V.accent : V.main,
                  color: msg.role === "user" ? V.white : V.t2,
                  fontSize: "12px", lineHeight: 1.5,
                  whiteSpace: "pre-wrap", wordBreak: "break-word"
                }}
              >
                {msg.content}
              </div>
            ))}
            {generating && (
              <div style={{
                padding: "10px", borderRadius: "8px",
                background: V.main, color: V.t3,
                fontSize: "12px", fontStyle: "italic"
              }}>
                🤖 スライドを生成中...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{
            padding: "12px", borderTop: `1px solid ${V.border}`,
            display: "flex", gap: "8px"
          }}>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey && !isComposing && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              placeholder={generated ? `スライド${slides[curSlide]?.id || ""}を修正...（例: もっと具体的に）` : "プレゼンの内容を入力..."}
              disabled={generating}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "6px",
                border: `1px solid ${V.border}`, fontSize: "12px",
                backgroundColor: V.white
              }}
            />
            <button
              onClick={sendChat}
              disabled={generating || !chatInput.trim()}
              style={{
                padding: "8px 12px", borderRadius: "6px",
                border: "none", background: generating ? V.t4 : V.accent,
                color: V.white, cursor: generating ? "wait" : "pointer",
                fontSize: "12px", fontWeight: 600, transition: "all 0.2s"
              }}
            >
              送信 →
            </button>
          </div>
        </div>

        {/* Center: Composition / Text Review (35%) */}
        <div style={{
          flex: "0 0 35%",
          borderRight: `1px solid ${V.border}`,
          display: "flex", flexDirection: "column",
          background: V.white, overflow: "hidden"
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${V.border}`,
            fontSize: "12px", fontWeight: 600, color: V.t3,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span>📑 構成・本文確認</span>
            <span style={{ fontSize: "11px", color: V.t4 }}>{slides.length}枚</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            {slides.map((s, i) => {
              const isSelected = curSlide === i;
              const inputStyle = { width:"100%", padding:"4px 8px", borderRadius:"4px", border:`1px solid ${V.border}`, fontSize:"12px", background:V.white, color:V.t1, boxSizing:"border-box" };
              const textareaStyle = { ...inputStyle, minHeight:"60px", resize:"vertical", lineHeight:1.6, fontFamily:"inherit" };
              const labelStyle = { fontSize:"10px", fontWeight:600, color:V.t3, marginBottom:"2px", marginTop:"8px", display:"block" };

              return (
              <div
                key={s.id}
                onClick={() => { setCurSlide(i); if (previewing) setPreviewing(true); }}
                style={{
                  padding: "14px", borderRadius: "6px",
                  background: isSelected ? `${preset.accent}08` : V.main,
                  cursor: "pointer", marginBottom: "10px",
                  fontSize: "12px",
                  border: `1px solid ${isSelected ? preset.accent : V.border}`,
                  transition: "all 0.2s"
                }}
              >
                {/* Header row: ID + heading + layout picker */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: isSelected ? "8px" : "4px"
                }}>
                  <span style={{ fontWeight: 700, color: V.t1, fontSize:"12px" }}>
                    {s.id}. {!isSelected ? (s.heading || s.title) : ""}
                  </span>
                  <select
                    value={s.layoutVariant || normalizeLayoutId(s.layout)}
                    onClick={e => e.stopPropagation()}
                    onChange={e => {
                      e.stopPropagation();
                      setSlides(prev => prev.map((sl, idx) =>
                        idx === i ? { ...sl, layoutVariant: e.target.value } : sl
                      ));
                    }}
                    style={{
                      fontSize: "10px", padding: "2px 6px", borderRadius: "6px",
                      background: `${preset.accent}10`, color: preset.accent,
                      border: `1px solid ${preset.accent}30`,
                      cursor: "pointer", fontWeight: 600, maxWidth: "140px"
                    }}
                  >
                    {getCompatibleLayouts(s).map(layout => (
                      <option key={layout.id} value={layout.id}>
                        {layout.icon} {layout.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── Collapsed view (not selected) ── */}
                {!isSelected && (
                  <>
                    {s.sub && <div style={{ fontSize:"11px", color:V.t2, marginBottom:"3px" }}>{s.sub}</div>}
                    {s.body && <div style={{ fontSize:"11px", color:V.t3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.body.slice(0,60)}{s.body.length>60?"...":""}</div>}
                    {s.items && s.items.length > 0 && <div style={{ fontSize:"10px", color:V.t4, marginTop:"2px" }}>📋 {s.items.length}項目</div>}
                    {s.stats && s.stats.length > 0 && <div style={{ fontSize:"10px", color:V.t4, marginTop:"2px" }}>📊 {s.stats.map(st=>st.value).join(" / ")}</div>}
                    {s.steps && s.steps.length > 0 && <div style={{ fontSize:"10px", color:V.t4, marginTop:"2px" }}>🔄 {s.steps.length}ステップ</div>}
                    {s.columns && s.columns.length > 0 && <div style={{ fontSize:"10px", color:V.t4, marginTop:"2px" }}>📐 {s.columns.map(c=>c.title).join(" vs ")}</div>}
                    {s.chartData && s.chartData.length > 0 && <div style={{ fontSize:"10px", color:V.t4, marginTop:"2px" }}>📈 {s.chartType || "bar"} ({s.chartData.length}項目)</div>}
                  </>
                )}

                {/* ── Expanded editable view (selected) ── */}
                {isSelected && (
                  <div onClick={e => e.stopPropagation()} style={{ display:"flex", flexDirection:"column" }}>
                    {/* Heading */}
                    <span style={labelStyle}>見出し</span>
                    <input
                      value={s.heading || s.title || ""}
                      onChange={e => updateSlide(i, { heading: e.target.value, title: e.target.value })}
                      style={{ ...inputStyle, fontWeight:700 }}
                    />

                    {/* Subtitle */}
                    <span style={labelStyle}>サブタイトル</span>
                    <input
                      value={s.sub || ""}
                      onChange={e => updateSlide(i, { sub: e.target.value })}
                      style={inputStyle}
                      placeholder="サブタイトル（省略可）"
                    />

                    {/* Body (for text/content layouts) */}
                    {(s.body !== undefined || s.layout === "content" || s.layout === "cover" || s.layout === "closing") && (
                      <>
                        <span style={labelStyle}>本文</span>
                        <textarea
                          value={s.body || ""}
                          onChange={e => updateSlide(i, { body: e.target.value })}
                          style={textareaStyle}
                          placeholder="本文テキスト"
                        />
                      </>
                    )}

                    {/* Items (bullets) */}
                    {s.items && s.items.length > 0 && (
                      <>
                        <span style={labelStyle}>📋 項目 ({s.items.length})</span>
                        {s.items.map((item, j) => (
                          <div key={j} style={{ display:"flex", gap:"4px", marginBottom:"4px", alignItems:"center" }}>
                            <input
                              value={item.icon || "▶"}
                              onChange={e => updateSlideItem(i, j, "icon", e.target.value)}
                              style={{ ...inputStyle, width:"32px", textAlign:"center", padding:"4px 2px", flexShrink:0 }}
                            />
                            <input
                              value={item.label || ""}
                              onChange={e => updateSlideItem(i, j, "label", e.target.value)}
                              style={{ ...inputStyle, flex:1, fontWeight:600 }}
                              placeholder="項目名"
                            />
                            <input
                              value={item.desc || ""}
                              onChange={e => updateSlideItem(i, j, "desc", e.target.value)}
                              style={{ ...inputStyle, flex:2 }}
                              placeholder="説明"
                            />
                          </div>
                        ))}
                      </>
                    )}

                    {/* Stats */}
                    {s.stats && s.stats.length > 0 && (
                      <>
                        <span style={labelStyle}>📊 数値・KPI ({s.stats.length})</span>
                        {s.stats.map((st, j) => (
                          <div key={j} style={{ display:"flex", gap:"4px", marginBottom:"4px", alignItems:"center" }}>
                            <input
                              value={st.value || ""}
                              onChange={e => updateSlideStat(i, j, "value", e.target.value)}
                              style={{ ...inputStyle, width:"70px", fontWeight:800, color:preset.accent, flexShrink:0 }}
                            />
                            <input
                              value={st.label || ""}
                              onChange={e => updateSlideStat(i, j, "label", e.target.value)}
                              style={{ ...inputStyle, flex:1, fontWeight:600 }}
                              placeholder="指標名"
                            />
                            <input
                              value={st.sub || ""}
                              onChange={e => updateSlideStat(i, j, "sub", e.target.value)}
                              style={{ ...inputStyle, flex:1 }}
                              placeholder="補足"
                            />
                          </div>
                        ))}
                      </>
                    )}

                    {/* Steps (timeline) */}
                    {s.steps && s.steps.length > 0 && (
                      <>
                        <span style={labelStyle}>🔄 ステップ ({s.steps.length})</span>
                        {s.steps.map((step, j) => (
                          <div key={j} style={{ display:"flex", gap:"4px", marginBottom:"4px", alignItems:"center" }}>
                            <span style={{ fontSize:"10px", fontWeight:800, color:preset.accent, width:"18px", textAlign:"center", flexShrink:0 }}>{j+1}</span>
                            <input
                              value={step.label || ""}
                              onChange={e => updateSlideStep(i, j, "label", e.target.value)}
                              style={{ ...inputStyle, flex:1, fontWeight:600 }}
                              placeholder="ステップ名"
                            />
                            <input
                              value={step.desc || ""}
                              onChange={e => updateSlideStep(i, j, "desc", e.target.value)}
                              style={{ ...inputStyle, flex:2 }}
                              placeholder="説明"
                            />
                          </div>
                        ))}
                      </>
                    )}

                    {/* Columns (comparison) */}
                    {s.columns && s.columns.length > 0 && (
                      <>
                        <span style={labelStyle}>📐 比較列 ({s.columns.length})</span>
                        {s.columns.map((col, j) => (
                          <div key={j} style={{ marginBottom:"6px", padding:"6px", background:`${preset.accent}05`, borderRadius:"4px", border:`1px solid ${V.border}` }}>
                            <input
                              value={col.title || ""}
                              onChange={e => updateSlideColumn(i, j, "title", e.target.value)}
                              style={{ ...inputStyle, fontWeight:700, marginBottom:"3px" }}
                              placeholder="列タイトル"
                            />
                            <textarea
                              value={(col.items || []).join("\n")}
                              onChange={e => updateSlideColumn(i, j, "items", e.target.value.split("\n"))}
                              style={{ ...textareaStyle, minHeight:"36px", fontSize:"11px" }}
                              placeholder="項目（1行1項目）"
                            />
                          </div>
                        ))}
                      </>
                    )}

                    {/* Chart Data */}
                    {s.chartData && s.chartData.length > 0 && (
                      <>
                        <span style={labelStyle}>📈 グラフデータ ({s.chartData.length})</span>
                        {s.chartData.map((d, j) => (
                          <div key={j} style={{ display:"flex", gap:"4px", marginBottom:"4px", alignItems:"center" }}>
                            <input
                              value={d.label || ""}
                              onChange={e => updateSlideChartData(i, j, "label", e.target.value)}
                              style={{ ...inputStyle, flex:2 }}
                              placeholder="ラベル"
                            />
                            <input
                              type="number"
                              value={d.value || 0}
                              onChange={e => updateSlideChartData(i, j, "value", e.target.value)}
                              style={{ ...inputStyle, width:"60px", fontWeight:700, flexShrink:0 }}
                            />
                          </div>
                        ))}
                      </>
                    )}

                    {/* Note */}
                    <span style={labelStyle}>💡 備考</span>
                    <input
                      value={s.note || ""}
                      onChange={e => updateSlide(i, { note: e.target.value })}
                      style={inputStyle}
                      placeholder="備考やフッター（省略可）"
                    />

                    {/* Per-slide chat hint */}
                    {generated && (
                      <div style={{ marginTop:"8px", padding:"6px 8px", background:`${V.accent}08`, borderRadius:"4px", fontSize:"10px", color:V.accent, lineHeight:1.4 }}>
                        💬 チャットで指示するとこのスライドだけ更新されます
                      </div>
                    )}
                  </div>
                )}

                {/* Color strip */}
                <div style={{
                  display: "flex", gap: "3px", marginTop: "8px",
                  paddingTop: "6px", borderTop: `1px solid ${V.border}`
                }}>
                  {(s.layout === "cover" || s.layout === "closing") ? (
                    <div style={{ flex: 1, height: "4px", borderRadius: "2px", background: preset.coverBg }} />
                  ) : (
                    <>
                      <div style={{ flex: 2, height: "4px", borderRadius: "2px", background: preset.contentBg, border: `1px solid ${V.border}` }} />
                      <div style={{ flex: 1, height: "4px", borderRadius: "2px", background: preset.accent }} />
                    </>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Right: Preview (35%) - empty until "PPTプレビュー" clicked */}
        <div style={{
          flex: "0 0 35%",
          display: "flex", flexDirection: "column",
          background: V.main, overflow: "hidden"
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${V.border}`,
            fontSize: "12px", fontWeight: 600, color: V.t3,
            background: V.white,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span>👁️ プレビュー</span>
            {previewing && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => setCurSlide(Math.max(0, curSlide - 1))}
                  disabled={curSlide === 0}
                  style={{
                    padding: "3px 7px", borderRadius: "4px",
                    border: `1px solid ${V.border}`, background: V.white,
                    cursor: curSlide === 0 ? "default" : "pointer",
                    fontSize: "11px", opacity: curSlide === 0 ? 0.3 : 1
                  }}
                >◀</button>
                <span style={{ fontSize: "11px", color: V.t4 }}>
                  {curSlide + 1} / {slides.length}
                </span>
                <button
                  onClick={() => setCurSlide(Math.min(slides.length - 1, curSlide + 1))}
                  disabled={curSlide === slides.length - 1}
                  style={{
                    padding: "3px 7px", borderRadius: "4px",
                    border: `1px solid ${V.border}`, background: V.white,
                    cursor: curSlide === slides.length - 1 ? "default" : "pointer",
                    fontSize: "11px", opacity: curSlide === slides.length - 1 ? 0.3 : 1
                  }}
                >▶</button>
              </div>
            )}
          </div>

          {!previewing ? (
            /* Empty state */
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              padding: "24px", textAlign: "center"
            }}>
              <div style={{ color: V.t4, fontSize: "13px", lineHeight: 1.6 }}>
                <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.3 }}>📊</div>
                テキスト内容を確定したら<br/>
                「PPTプレビュー」で確認できます
              </div>
            </div>
          ) : (
            /* Slide preview - scalable virtual canvas approach */
            <>
              <div style={{
                flex: 1, overflow: "hidden", padding: "12px",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {/* Outer wrapper maintains aspect ratio and scales the virtual canvas */}
                <div
                  ref={el => {
                    if (!el) return;
                    const ro = new ResizeObserver(() => {
                      const W = el.clientWidth, H = el.clientHeight;
                      const inner = el.firstChild;
                      if (!inner) return;
                      // Virtual canvas is 960x540 (16:9), scale to fit container
                      const scale = Math.min(W / 960, H / 540);
                      inner.style.transform = `scale(${scale})`;
                    });
                    ro.observe(el);
                    // cleanup on unmount handled by React
                  }}
                  style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden"
                  }}
                >
                  {/* Virtual 960x540 canvas - always renders at this size, then CSS-scaled */}
                  <div style={{
                    width: "960px", height: "540px",
                    flexShrink: 0,
                    borderRadius: "8px",
                    ...getPreviewBg(slide),
                    border: `1px solid ${V.border}`,
                    overflow: "hidden",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    position: "relative",
                    transformOrigin: "center center"
                  }}>
                    {/* Template visual elements layer */}
                    {templateFile && templateInfo && (() => {
                      const isCov = slide.layout === "cover" || slide.layout === "closing";
                      const elms = isCov ? (templateInfo.coverElements || []) : (templateInfo.contentElements || []);
                      return elms.map((el, idx) => {
                        if (el.type === "rect") return (
                          <div key={`te${idx}`} style={{
                            position:"absolute", left:`${el.x}%`, top:`${el.y}%`,
                            width:`${el.w}%`, height:`${el.h}%`,
                            background: el.fill, opacity: el.opacity ?? 1,
                            pointerEvents:"none", zIndex: 1
                          }} />
                        );
                        if (el.type === "img") return (
                          <img key={`te${idx}`} src={el.src} alt="" style={{
                            position:"absolute", left:`${el.x}%`, top:`${el.y}%`,
                            width:`${el.w}%`, height:`${el.h}%`,
                            objectFit:"contain", pointerEvents:"none", zIndex: 1
                          }} />
                        );
                        return null;
                      });
                    })()}

                    {/* Text content layer */}
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                      zIndex: 2,
                      display: "flex", flexDirection: "column",
                      alignItems: (slide.layout === "cover" || slide.layout === "closing")
                        ? (preset.coverAlign === "left" ? "flex-start" : "center")
                        : (preset.contentAlign === "left" ? "flex-start" : "center"),
                      justifyContent: (slide.layout === "cover" || slide.layout === "closing") ? "center" : "flex-start",
                      padding: "48px",
                      color: getPreviewTextColor(slide)
                    }}>
                    {(slide.layout === "cover" || slide.layout === "closing") ? (
                      <>
                        {/* Cover accent bar for left-aligned presets */}
                        {preset.coverAlign === "left" && (
                          <div style={{
                            width: preset.accentBarWidth,
                            height: preset.accentBarHeight,
                            background: preset.accent,
                            borderRadius: "2px",
                            marginBottom: "16px"
                          }} />
                        )}
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => updateSlide(curSlide, { heading: e.currentTarget.textContent, title: e.currentTarget.textContent })}
                          style={{
                            fontSize: preset.headingSizeCover, fontWeight: 800,
                            textAlign: preset.coverAlign, lineHeight: 1.3, marginBottom: "20px",
                            fontFamily: tmHeadingFont,
                            color: getPreviewTextColor(slide),
                            width: "100%",
                            outline: "none", cursor: "text",
                            borderRadius: "4px", transition: "box-shadow 0.2s",
                          }}
                          onFocus={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${tmAccent}40`}
                          onBlurCapture={e => e.currentTarget.style.boxShadow = "none"}
                        >
                          {slide.heading || slide.title}
                        </div>
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => updateSlide(curSlide, { sub: e.currentTarget.textContent })}
                          style={{
                            fontSize: "22px", textAlign: preset.coverAlign,
                            color: getPreviewSubColor(slide),
                            fontFamily: tmBodyFont,
                            width: "100%",
                            outline: "none", cursor: "text", minHeight: "28px",
                            borderRadius: "4px", transition: "box-shadow 0.2s",
                          }}
                          onFocus={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${tmAccent}40`}
                          onBlurCapture={e => e.currentTarget.style.boxShadow = "none"}
                        >
                          {slide.sub || ""}
                        </div>
                        {slide.note && (
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={e => updateSlide(curSlide, { note: e.currentTarget.textContent })}
                            style={{
                              position: "absolute", bottom: "24px", right: "32px",
                              fontSize: "16px", opacity: 0.7,
                              fontFamily: tmBodyFont,
                              outline: "none", cursor: "text",
                              borderRadius: "4px", transition: "box-shadow 0.2s",
                            }}
                            onFocus={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${tmAccent}40`}
                            onBlurCapture={e => e.currentTarget.style.boxShadow = "none"}
                          >
                            {slide.note}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Heading area - common to all content layouts */}
                        <div style={{
                          width: preset.accentBarWidth === "100%" ? "100%" : preset.accentBarWidth,
                          height: preset.accentBarHeight,
                          background: tmAccent,
                          borderRadius: "2px",
                          marginBottom: "12px"
                        }} />
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => updateSlide(curSlide, { heading: e.currentTarget.textContent, title: e.currentTarget.textContent })}
                          style={{
                            fontSize: preset.headingSizeContent, fontWeight: 800, marginBottom: "8px",
                            fontFamily: tmHeadingFont,
                            color: getPreviewTextColor(slide),
                            width: "100%",
                            outline: "none", cursor: "text",
                            borderRadius: "4px", transition: "box-shadow 0.2s",
                          }}
                          onFocus={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${tmAccent}40`}
                          onBlurCapture={e => e.currentTarget.style.boxShadow = "none"}
                        >
                          {slide.heading || slide.title}
                        </div>
                        {slide.sub !== undefined && (
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={e => updateSlide(curSlide, { sub: e.currentTarget.textContent })}
                            style={{
                              fontSize: "18px",
                              color: getPreviewSubColor(slide),
                              marginBottom: "16px", fontWeight: 500,
                              fontFamily: tmBodyFont,
                              width: "100%",
                              outline: "none", cursor: "text", minHeight: "22px",
                              borderRadius: "4px", transition: "box-shadow 0.2s",
                            }}
                            onFocus={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${tmAccent}40`}
                            onBlurCapture={e => e.currentTarget.style.boxShadow = "none"}
                          >
                            {slide.sub || ""}
                          </div>
                        )}

                        {/* === Layout-specific content (45+ variants via LayoutRenderers) === */}
                        {renderLayoutContent(slide, slide.layoutVariant || normalizeLayoutId(slide.layout), {
                          accent: tmAccent,
                          textColor: getPreviewTextColor(slide),
                          subColor: getPreviewSubColor(slide),
                          headingFont: tmHeadingFont,
                          bodyFont: tmBodyFont,
                          V
                        })}
                      </>
                    )}
                    </div>{/* close text content layer */}
                  </div>{/* close 960x540 virtual canvas */}
                </div>{/* close scale wrapper */}
              </div>

              <div style={{
                padding: "10px 16px",
                borderTop: `1px solid ${V.border}`,
                background: V.white,
                fontSize: "11px", color: V.t4,
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <span><strong>{slide.heading || slide.title}</strong> — {(() => { const l = getLayout(slide.layoutVariant || normalizeLayoutId(slide.layout)); return l ? `${l.icon} ${l.name}` : slide.layoutLabel || slide.layout; })()}</span>
                <span style={{
                  fontSize: "10px", padding: "2px 8px",
                  background: `${preset.accent}15`, color: preset.accent,
                  borderRadius: "4px", fontWeight: 600
                }}>
                  {templateFile ? "テンプレ適用" : preset.name}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
