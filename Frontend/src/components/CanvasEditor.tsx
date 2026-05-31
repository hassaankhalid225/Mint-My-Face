"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import * as fabric from "fabric";
import html2canvas from "html2canvas";
import {
  Upload,
  Type,
  Trash2,
  Download,
  RotateCcw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  CheckCircle,
  AlertCircle,
  Loader,
  Move,
  Keyboard,
  ImageIcon,
} from "lucide-react";
import MintResultModal from "@/components/MintResultModal";
import FilterSlider from "@/components/FilterSlider";
import {
  ApiError,
  saveDesign,
  checkApiHealth,
  type DesignCreateResult,
} from "@/lib/api";

const NOTE_SRC = "/dollar-note.png";
const BILL_ASPECT = 5180 / 2256;
const PAPER_BG = "#ebe6d6";

/** Transparent portrait hole on the template (fractions of note size). */
const PORTRAIT = { cx: 0.5, cy: 0.5, w: 0.22, h: 0.62 } as const;

type PhotoFilters = {
  grayscale: number;
  brightness: number;
  contrast: number;
  opacity: number;
};

const DEFAULT_FILTERS: PhotoFilters = {
  grayscale: 70,
  brightness: 80,
  contrast: 84,
  opacity: 97,
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function computeComposeSize(containerW: number, containerH: number) {
  const pad = 32;
  const maxW = Math.max(320, containerW - pad);
  const maxH = Math.max(180, containerH - pad);
  let w = maxW;
  let h = w / BILL_ASPECT;
  if (h > maxH) {
    h = maxH;
    w = h * BILL_ASPECT;
  }
  return { width: Math.floor(w), height: Math.floor(h) };
}

type ToastType = "success" | "error" | "loading";

interface Toast {
  msg: string;
  type: ToastType;
}

export default function CanvasEditor() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email ?? null;

  const stageRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLDivElement>(null);
  const textCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const resizeRef = useRef<{
    pointerId: number;
    startY: number;
    origScale: number;
  } | null>(null);
  const pendingDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [toast, setToast] = useState<Toast | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [mintResult, setMintResult] = useState<DesignCreateResult | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [textCount, setTextCount] = useState(0);

  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [photoPos, setPhotoPos] = useState<{ x: number; y: number }>({
    x: PORTRAIT.cx,
    y: PORTRAIT.cy,
  });
  const [photoScale, setPhotoScale] = useState(1.15);
  const [photoFlipX, setPhotoFlipX] = useState(false);
  const [photoAngle, setPhotoAngle] = useState(0);
  const [photoActive, setPhotoActive] = useState(false);
  const [textEditMode, setTextEditMode] = useState(false);
  const suppressClickRef = useRef(false);

  const [filters, setFilters] = useState<PhotoFilters>({ ...DEFAULT_FILTERS });

  const photoFilterCss = useMemo(
    () =>
      `grayscale(${filters.grayscale}%) brightness(${filters.brightness}%) contrast(${filters.contrast}%)`,
    [filters.grayscale, filters.brightness, filters.contrast],
  );

  const showToast = useCallback((msg: string, type: ToastType, duration = 3000) => {
    setToast({ msg, type });
    if (type !== "loading") setTimeout(() => setToast(null), duration);
  }, []);

  const syncTextCount = useCallback((c: fabric.Canvas) => {
    setTextCount(c.getObjects().filter((o) => o instanceof fabric.IText).length);
  }, []);

  useEffect(() => {
    checkApiHealth().then(setApiOnline);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions(computeComposeSize(rect.width, rect.height));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    return () => {
      fabricRef.current?.dispose();
      fabricRef.current = null;
    };
  }, []);

  useEffect(() => {
    const el = textCanvasRef.current;
    if (!el || dimensions.width < 100) return;

    let fc = fabricRef.current;
    if (!fc) {
      fc = new fabric.Canvas(el, {
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: "transparent",
        selection: true,
      });
      fabricRef.current = fc;

      fc.on("selection:created", () => syncTextCount(fc!));
      fc.on("selection:updated", () => syncTextCount(fc!));
      fc.on("selection:cleared", () => syncTextCount(fc!));
      fc.on("object:added", () => syncTextCount(fc!));
      fc.on("object:removed", () => syncTextCount(fc!));
    } else {
      fc.setDimensions({ width: dimensions.width, height: dimensions.height });
    }
    fc.requestRenderAll();
  }, [dimensions.width, dimensions.height, syncTextCount]);

  useEffect(() => {
    const el = textCanvasRef.current;
    if (!el) return;
    const wrap = el.parentElement;
    const pe = textEditMode && !photoActive ? "auto" : "none";
    el.style.pointerEvents = pe;
    if (wrap) wrap.style.pointerEvents = pe;
  }, [textEditMode, photoActive]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (
        pendingDragRef.current &&
        pendingDragRef.current.pointerId === e.pointerId &&
        !dragRef.current
      ) {
        const dx = e.clientX - pendingDragRef.current.startX;
        const dy = e.clientY - pendingDragRef.current.startY;
        if (Math.hypot(dx, dy) > 5) {
          dragRef.current = pendingDragRef.current;
          pendingDragRef.current = null;
        }
      }
      if (dragRef.current && dragRef.current.pointerId === e.pointerId && composeRef.current) {
        const rect = composeRef.current.getBoundingClientRect();
        const dx = (e.clientX - dragRef.current.startX) / rect.width;
        const dy = (e.clientY - dragRef.current.startY) / rect.height;
        if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) suppressClickRef.current = true;
        setPhotoPos({
          x: clamp(dragRef.current.origX + dx, 0, 1),
          y: clamp(dragRef.current.origY + dy, 0, 1),
        });
      }
      if (resizeRef.current && resizeRef.current.pointerId === e.pointerId) {
        const dy = (resizeRef.current.startY - e.clientY) / 200;
        setPhotoScale(clamp(resizeRef.current.origScale + dy, 0.2, 4));
      }
    };
    const onUp = (e: PointerEvent) => {
      if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
      if (pendingDragRef.current?.pointerId === e.pointerId) pendingDragRef.current = null;
      if (resizeRef.current?.pointerId === e.pointerId) resizeRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      if (!data) return;
      requestAnimationFrame(() => {
        setPhotoPos({ x: PORTRAIT.cx, y: PORTRAIT.cy });
        setPhotoScale(1.15);
        setPhotoFlipX(false);
        setPhotoAngle(0);
        setFilters({ ...DEFAULT_FILTERS });
        setPhotoSrc(data);
        setPhotoActive(true);
        setTextEditMode(false);
        showToast("Photo selected — drag to move, scroll to resize.", "success");
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const selectPhoto = useCallback(() => {
    setPhotoActive(true);
    setTextEditMode(false);
    fabricRef.current?.discardActiveObject();
    fabricRef.current?.requestRenderAll();
  }, []);

  const handlePhotoHitPointerDown = (e: React.PointerEvent) => {
    if (!photoSrc || resizeRef.current) return;
    e.stopPropagation();
    e.preventDefault();

    if ((e.target as HTMLElement).classList.contains("note-compose__resize-handle")) return;

    selectPhoto();
    suppressClickRef.current = false;

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: photoPos.x,
      origY: photoPos.y,
    };
    pendingDragRef.current = null;
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    if (!photoSrc) return;
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      origScale: photoScale,
    };
  };

  const handlePhotoWheel = (e: React.WheelEvent) => {
    if (!photoSrc) return;
    e.stopPropagation();
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    setPhotoScale((s) => clamp(s + delta, 0.2, 4));
  };

  const handleAddText = () => {
    setPhotoActive(false);
    setTextEditMode(true);
    const fc = fabricRef.current;
    if (!fc) return;
    const text = new fabric.IText("Your Name", {
      left: fc.getWidth() / 2,
      top: fc.getHeight() * 0.12,
      originX: "center",
      originY: "center",
      fontFamily: "Georgia, serif",
      fontSize: Math.round(fc.getWidth() / 18),
      fontWeight: "bold",
      fill: "#1a4a2a",
      stroke: "#0a2a12",
      strokeWidth: 0.5,
      cornerColor: "#2b5f38",
      cornerStyle: "circle",
      cornerSize: 10,
      borderColor: "#2b5f38",
    });
    fc.add(text);
    fc.setActiveObject(text);
    setPhotoActive(false);
    fc.requestRenderAll();
    showToast("Double-click text to edit.", "success");
  };

  const handleDeleteSelected = () => {
    if (photoActive && photoSrc) {
      setPhotoSrc(null);
      setPhotoActive(false);
      return;
    }
    const fc = fabricRef.current;
    if (!fc) return;
    const active = fc.getActiveObjects();
    if (active.length) {
      active.forEach((o) => fc.remove(o));
      fc.discardActiveObject();
      fc.requestRenderAll();
    }
  };

  const handleFlip = () => {
    if (!photoActive) return;
    setPhotoFlipX((f) => !f);
  };

  const handleRotate = () => {
    if (!photoActive) return;
    setPhotoAngle((a) => (a + 90) % 360);
  };

  const handleZoom = (delta: number) => {
    if (!photoActive) return;
    setPhotoScale((s) => clamp(s + delta, 0.2, 4));
  };

  const handleClearAll = () => {
    setPhotoSrc(null);
    setPhotoActive(false);
    const fc = fabricRef.current;
    if (fc) {
      fc.getObjects().forEach((o) => fc.remove(o));
      fc.discardActiveObject();
      fc.requestRenderAll();
    }
  };

  const downloadLocalPng = (dataURL: string) => {
    const link = document.createElement("a");
    link.download = "mint-my-face-note.png";
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = async () => {
    if (!composeRef.current) return;
    setIsDownloading(true);
    showToast("Minting your note...", "loading");

    fabricRef.current?.discardActiveObject();
    fabricRef.current?.requestRenderAll();
    setPhotoActive(false);

    const hitLayer = composeRef.current.querySelector(".note-compose__photo-hit");
    const hitWasVisible =
      hitLayer instanceof HTMLElement ? hitLayer.style.visibility : "";
    if (hitLayer instanceof HTMLElement) hitLayer.style.visibility = "hidden";

    const wm = watermarkRef.current;
    const wmWasVisible = wm?.style.visibility ?? "";
    if (wm) wm.style.visibility = "hidden";

    await new Promise((r) => setTimeout(r, 80));

    try {
      const snapshot = await html2canvas(composeRef.current, {
        backgroundColor: PAPER_BG,
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      const dataURL = snapshot.toDataURL("image/png");

      try {
        const res = await fetch(dataURL);
        const blob = await res.blob();
        const result = await saveDesign(blob, userEmail);
        setMintResult(result);
        showToast("Design saved! Choose preview or unlock HD.", "success", 4000);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          showToast(err.message, "error", 6000);
          return;
        }
        downloadLocalPng(dataURL);
        showToast(
          apiOnline === false
            ? "Backend offline — saved locally."
            : "Saved locally. Could not reach server.",
          apiOnline === false ? "error" : "success",
          5000,
        );
      }
    } catch {
      showToast("Could not capture image. Try again.", "error");
    } finally {
      if (hitLayer instanceof HTMLElement) hitLayer.style.visibility = hitWasVisible || "visible";
      if (wm) wm.style.visibility = wmWasVisible || "visible";
      setIsDownloading(false);
      setToast((t) => (t?.type === "loading" ? null : t));
    }
  };

  const canTransformPhoto = photoActive && !!photoSrc;
  const photoTransform = `scaleX(${photoFlipX ? -1 : 1}) rotate(${photoAngle}deg)`;
  const photoBoxSize = {
    width: `${PORTRAIT.w * 140}%`,
    height: `${PORTRAIT.h * 140}%`,
  };
  const photoLayerStyle = {
    left: `${photoPos.x * 100}%`,
    top: `${photoPos.y * 100}%`,
    width: photoBoxSize.width,
    height: photoBoxSize.height,
    transform: `translate(-50%, -50%) scale(${photoScale})`,
  };

  return (
    <div className="editor-workspace">
      <section className="editor-preview-panel" aria-label="Dollar bill preview">
        <p className="editor-preview-label">Live preview</p>
        <div ref={stageRef} className="editor-preview-stage">
          <div
            ref={composeRef}
            className="note-compose"
            onClick={(e) => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                return;
              }
              const t = e.target as HTMLElement;
              if (t.closest(".note-compose__photo-hit")) return;
              setPhotoActive(false);
              setTextEditMode(true);
              fabricRef.current?.discardActiveObject();
              fabricRef.current?.requestRenderAll();
            }}
            style={{
              width: dimensions.width || undefined,
              height: dimensions.height || undefined,
              background: PAPER_BG,
            }}
          >
            {/* Layer order is fixed — never mount/unmount around Fabric canvas (prevents insertBefore crash) */}
            <div
              className="note-compose__photo-visual"
              style={{
                ...photoLayerStyle,
                visibility: photoSrc ? "visible" : "hidden",
              }}
              aria-hidden
            >
              {photoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoSrc}
                  alt=""
                  draggable={false}
                  className="note-compose__photo"
                  style={{
                    width: "100%",
                    height: "100%",
                    transform: photoTransform,
                    filter: photoFilterCss,
                    opacity: filters.opacity / 100,
                  }}
                />
              ) : null}
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NOTE_SRC}
              alt=""
              className="note-compose__note"
              draggable={false}
            />

            <div
              ref={watermarkRef}
              className="note-compose__preview-watermark"
              aria-hidden
            >
              <span className="note-compose__wm-line">MINT MY FACE</span>
            </div>

            <div
              className={`note-compose__photo-hit${photoActive ? " note-compose__photo-hit--active" : ""}`}
              style={{
                ...photoLayerStyle,
                visibility: photoSrc ? "visible" : "hidden",
                pointerEvents: photoSrc ? "auto" : "none",
              }}
              onPointerDown={handlePhotoHitPointerDown}
              onWheel={handlePhotoWheel}
              onClick={(e) => e.stopPropagation()}
              role="button"
              tabIndex={photoSrc ? 0 : -1}
              aria-hidden={!photoSrc}
              aria-label="Your photo — click to select, drag to move, scroll to resize"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") selectPhoto();
              }}
            >
              {photoActive && photoSrc
                ? (["nw", "ne", "sw", "se"] as const).map((corner) => (
                    <span
                      key={corner}
                      className={`note-compose__resize-handle note-compose__resize-handle--${corner}`}
                      onPointerDown={handleResizePointerDown}
                    />
                  ))
                : null}
            </div>

            <canvas
              ref={textCanvasRef}
              className="note-compose__text-layer"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <p className="editor-preview-footer">
          MINT MY FACE watermark on note · drag selection box to move · unlock HD to remove watermark
        </p>
      </section>

      <aside className="editor-sidebar" aria-label="Editor tools">
        <div className="editor-sidebar-scroll">
          <div>
            <h2 className="editor-sidebar-title">Edit your note</h2>
            <p className="editor-sidebar-sub">
              Upload a photo — it sits behind the transparent portrait hole.
            </p>
          </div>

          <div className="editor-tool-section">
            <h3>Photo</h3>
            <div className="editor-tool-grid">
              <label className="editor-tool-btn editor-tool-btn--primary" style={{ cursor: "pointer" }}>
                <Upload size={18} />
                Upload photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>

          {photoSrc && !photoActive && (
            <button
              type="button"
              className="editor-tool-btn editor-tool-btn--primary"
              onClick={selectPhoto}
              style={{ width: "100%" }}
            >
              <ImageIcon size={18} />
              Select photo to edit
            </button>
          )}

          {photoSrc && textEditMode && (
            <button
              type="button"
              className="editor-tool-btn"
              onClick={selectPhoto}
              style={{ width: "100%" }}
            >
              <Move size={18} />
              Back to photo editing
            </button>
          )}

          {photoSrc && photoActive && (
            <p className="editor-photo-hint">
              Photo selected — drag, scroll, or use handles
            </p>
          )}

          {photoSrc && (
            <div className="editor-tool-section">
              <h3>Photo filters</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <FilterSlider
                  label="Grayscale"
                  min={0}
                  max={100}
                  value={filters.grayscale}
                  onChange={(v) => setFilters((f) => ({ ...f, grayscale: v }))}
                />
                <FilterSlider
                  label="Brightness"
                  min={50}
                  max={150}
                  value={filters.brightness}
                  onChange={(v) => setFilters((f) => ({ ...f, brightness: v }))}
                />
                <FilterSlider
                  label="Contrast"
                  min={50}
                  max={200}
                  value={filters.contrast}
                  onChange={(v) => setFilters((f) => ({ ...f, contrast: v }))}
                />
                <FilterSlider
                  label="Opacity"
                  min={50}
                  max={100}
                  value={filters.opacity}
                  onChange={(v) => setFilters((f) => ({ ...f, opacity: v }))}
                />
                <button
                  type="button"
                  className="editor-tool-btn"
                  onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                  style={{ width: "100%", fontSize: "0.75rem" }}
                >
                  Reset filters
                </button>
              </div>
            </div>
          )}

          <div className="editor-tool-section">
            <h3>Text</h3>
            <div className="editor-tool-grid">
              <button type="button" className="editor-tool-btn" onClick={handleAddText}>
                <Type size={18} />
                Add text
              </button>
            </div>
          </div>

          <div className="editor-tool-section">
            <h3>Transform {photoActive ? "(photo)" : ""}</h3>
            <div className="editor-tool-grid">
              <button
                type="button"
                className="editor-tool-btn"
                onClick={handleFlip}
                disabled={!canTransformPhoto}
              >
                <FlipHorizontal size={18} />
                Flip
              </button>
              <button
                type="button"
                className="editor-tool-btn"
                onClick={handleRotate}
                disabled={!canTransformPhoto}
              >
                <RotateCcw size={18} />
                Rotate
              </button>
              <button
                type="button"
                className="editor-tool-btn"
                onClick={() => handleZoom(0.08)}
                disabled={!canTransformPhoto}
              >
                <ZoomIn size={18} />
                Bigger
              </button>
              <button
                type="button"
                className="editor-tool-btn"
                onClick={() => handleZoom(-0.08)}
                disabled={!canTransformPhoto}
              >
                <ZoomOut size={18} />
                Smaller
              </button>
            </div>
          </div>

          <div className="editor-tool-section">
            <h3>Actions</h3>
            <div className="editor-tool-grid">
              <button
                type="button"
                className="editor-tool-btn editor-tool-btn--danger"
                onClick={handleDeleteSelected}
                disabled={!photoSrc && textCount === 0}
              >
                <Trash2 size={18} />
                {photoActive ? "Remove photo" : "Delete"}
              </button>
              {(photoSrc || textCount > 0) && (
                <button type="button" className="editor-tool-btn" onClick={handleClearAll}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="editor-tool-section">
            <h3>Tips</h3>
            <ul className="editor-tips-list">
              <li>
                <Move size={14} /> Drag photo to move anywhere
              </li>
              <li>
                <ImageIcon size={14} /> Corners or scroll to resize
              </li>
              <li>
                <Keyboard size={14} /> Click photo, then adjust filters
              </li>
            </ul>
          </div>

          {apiOnline === false && (
            <p className="editor-api-warn">
              API offline — start backend on port 8000 for HD unlock.
            </p>
          )}
        </div>

        <div className="editor-sidebar-footer">
          <button
            type="button"
            id="mint-note-btn"
            className="editor-tool-btn editor-tool-btn--accent"
            onClick={handleDownload}
            disabled={isDownloading}
            style={{ width: "100%", cursor: isDownloading ? "not-allowed" : "pointer" }}
          >
            {isDownloading ? (
              <Loader size={20} style={{ animation: "editor-spin 1s linear infinite" }} />
            ) : (
              <Download size={20} />
            )}
            {isDownloading ? "Minting…" : "MINT NOTE"}
          </button>
        </div>
      </aside>

      {toast && (
        <div role="status" className="editor-toast">
          {toast.type === "success" && <CheckCircle size={18} style={{ color: "var(--color-success)" }} />}
          {toast.type === "error" && <AlertCircle size={18} style={{ color: "var(--color-danger)" }} />}
          {toast.type === "loading" && (
            <Loader size={18} style={{ animation: "editor-spin 1s linear infinite" }} />
          )}
          {toast.msg}
        </div>
      )}

      {mintResult && (
        <MintResultModal
          result={mintResult}
          onClose={() => setMintResult(null)}
        />
      )}

      <style>{`@keyframes editor-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
