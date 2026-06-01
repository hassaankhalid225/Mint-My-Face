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
  Undo2,
  Redo2,
} from "lucide-react";
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  restoreHistory,
  type EditorHistory,
} from "@/lib/editor-history";
import MintResultModal from "@/components/MintResultModal";
import FilterSlider from "@/components/FilterSlider";
import EditorLayersPanel from "@/components/EditorLayersPanel";
import {
  buildLayerRows,
  findTextByLayerId,
  getSelectedLayerId,
  reorderTextLayers,
  ensureLayerId,
  registerLayerId,
  type LayerRow,
} from "@/lib/editor-layers";
import {
  ApiError,
  saveDesign,
  uploadCanvasSnapshot,
  checkApiHealth,
  type DesignCreateResult,
} from "@/lib/api";

const NOTE_SRC = "/dollar-note.png";
const BILL_ASPECT = 5180 / 2256;
const PAPER_BG = "#ebe6d6";
const FABRIC_ACCENT = "#2b5f38";
const FABRIC_SEL_TINT = "rgba(43, 95, 56, 0.12)";

/** Fabric defaults to blue/purple selection — override before any canvas is created */
if (fabric.Canvas.ownDefaults) {
  Object.assign(fabric.Canvas.ownDefaults, {
    selection: false,
    selectionColor: FABRIC_SEL_TINT,
    selectionBorderColor: FABRIC_ACCENT,
  });
}
if (fabric.FabricObject.ownDefaults) {
  Object.assign(fabric.FabricObject.ownDefaults, {
    selectionBackgroundColor: "rgba(0,0,0,0)",
    borderColor: FABRIC_ACCENT,
    cornerColor: FABRIC_ACCENT,
  });
}

/** Transparent portrait hole on the template (fractions of note size). */
const PORTRAIT = { cx: 0.5, cy: 0.5, w: 0.22, h: 0.62 } as const;

/** Default text slots on the dollar-note template (fractions of canvas size). */
const NOTE_TEXT_NAME = { left: 0.088, top: 0.492, width: 0.158 } as const;
const NOTE_TEXT_BODY = { left: 0.058, top: 0.668, width: 0.3 } as const;
/** Previous default slots — used to migrate existing sessions. */
const LEGACY_NOTE_TEXT_NAME_SLOTS = [
  { left: 0.078, top: 0.2, width: 0.2 },
  { left: 0.108, top: 0.318, width: 0.168 },
] as const;
const DEFAULT_NAME_LAYER_ID = "text-name";
const DEFAULT_BODY_LAYER_ID = "text-body";
const NOTE_TEXT_DEFAULT_COLOR = "#41413e";
const NOTE_TEXT_DEFAULT_SIZE = 25;

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

const TEXT_FONTS = [
  { value: "Georgia, serif", label: "Georgia (classic bill)" },
  { value: "'Times New Roman', Times, serif", label: "Times New Roman" },
  { value: "Impact, Haettenschweiler, sans-serif", label: "Impact" },
  { value: "'Arial Black', Gadget, sans-serif", label: "Arial Black" },
  { value: "'Brush Script MT', 'Segoe Script', cursive", label: "Script (candy style)" },
  { value: "'Courier New', Courier, monospace", label: "Courier New" },
  { value: "Verdana, Geneva, sans-serif", label: "Verdana" },
] as const;

function applyTextControlDefaults(text: fabric.IText) {
  text.set({
    lockScalingX: false,
    lockScalingY: false,
    lockUniScaling: true,
    hasControls: true,
    hasBorders: true,
    editable: true,
    selectable: true,
    evented: true,
    cornerColor: FABRIC_ACCENT,
    cornerStyle: "circle",
    cornerSize: 12,
    borderColor: FABRIC_ACCENT,
    padding: 6,
    selectionBackgroundColor: "rgba(0,0,0,0)",
    selectionColor: FABRIC_SEL_TINT,
    borderOpacityWhenMoving: 1,
  });
}

function clearFabricSelection(fc: fabric.Canvas | null) {
  if (!fc) return;
  fc.discardActiveObject();
  fc.requestRenderAll();
}

/** Fabric draws a blue drag box when selection is true — keep it off for this editor. */
function disableCanvasDragSelection(fc: fabric.Canvas) {
  fc.selection = false;
}

function applyNoteTextSlot(
  text: fabric.IText,
  slot: { left: number; top: number; width: number },
  w: number,
  h: number,
) {
  text.set({
    left: w * slot.left,
    top: h * slot.top,
    width: w * slot.width,
  });
  text.setCoords();
}

function textNearSlot(
  text: fabric.IText,
  slot: { left: number; top: number; width: number },
  w: number,
  h: number,
  tolerance = 0.02,
) {
  return (
    Math.abs(text.left! - w * slot.left) <= w * tolerance &&
    Math.abs(text.top! - h * slot.top) <= h * tolerance
  );
}

/** Reposition default name text if it is still at a known legacy slot. */
function migrateDefaultNameSlot(fc: fabric.Canvas) {
  const w = fc.getWidth();
  const h = fc.getHeight();
  const nameText = findTextByLayerId(fc, DEFAULT_NAME_LAYER_ID);
  if (!nameText) return;
  for (const slot of LEGACY_NOTE_TEXT_NAME_SLOTS) {
    if (textNearSlot(nameText, slot, w, h)) {
      applyNoteTextSlot(nameText, NOTE_TEXT_NAME, w, h);
      return;
    }
  }
}

function seedDefaultNoteText(fc: fabric.Canvas) {
  if (fc.getObjects().some((o) => o.type === "i-text")) return;

  const w = fc.getWidth();
  const h = fc.getHeight();

  const nameText = new fabric.IText("Your name", {
    left: w * NOTE_TEXT_NAME.left,
    top: h * NOTE_TEXT_NAME.top,
    originX: "left",
    originY: "top",
    fontFamily: TEXT_FONTS[0].value,
    fontSize: NOTE_TEXT_DEFAULT_SIZE,
    fontWeight: "bold",
    fill: NOTE_TEXT_DEFAULT_COLOR,
    width: w * NOTE_TEXT_NAME.width,
  });
  applyTextControlDefaults(nameText);
  registerLayerId(nameText, DEFAULT_NAME_LAYER_ID);

  const bodyText = new fabric.IText("", {
    left: w * NOTE_TEXT_BODY.left,
    top: h * NOTE_TEXT_BODY.top,
    originX: "left",
    originY: "top",
    fontFamily: TEXT_FONTS[0].value,
    fontSize: NOTE_TEXT_DEFAULT_SIZE,
    fill: NOTE_TEXT_DEFAULT_COLOR,
    width: w * NOTE_TEXT_BODY.width,
    lineHeight: 1.3,
  });
  applyTextControlDefaults(bodyText);
  registerLayerId(bodyText, DEFAULT_BODY_LAYER_ID);

  fc.add(nameText, bodyText);
}

function normalizeTextScale(text: fabric.IText): boolean {
  const sx = text.scaleX ?? 1;
  const sy = text.scaleY ?? 1;
  const scale = Math.max(sx, sy);
  if (Math.abs(scale - 1) < 0.02) return false;
  const base = text.fontSize ?? 24;
  text.set({
    fontSize: clamp(Math.round(base * scale), 8, 240),
    scaleX: 1,
    scaleY: 1,
  });
  text.setCoords();
  return true;
}

const TEXT_COLOR_PRESETS = [
  "#41413e",
  "#1a4a2a",
  "#0a2a12",
  "#2b5f38",
  "#1e3a5f",
  "#5c4033",
  "#000000",
  "#ffffff",
  "#8b0000",
] as const;

function isFabricText(obj: fabric.FabricObject | undefined | null): obj is fabric.IText {
  return !!obj && obj.type === "i-text";
}

function getActiveText(fc: fabric.Canvas): fabric.IText | null {
  const active = fc.getActiveObject();
  if (isFabricText(active)) return active;
  if (active?.type === "activeselection") {
    const sel = active as fabric.ActiveSelection;
    const found = sel.getObjects().find((o) => isFabricText(o));
    return found && isFabricText(found) ? found : null;
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type PhotoCorner = "nw" | "ne" | "sw" | "se";

function pointerInPhotoZone(
  px: number,
  py: number,
  cw: number,
  ch: number,
  photoPos: { x: number; y: number },
  photoScale: number,
): boolean {
  const boxW = cw * PORTRAIT.w * 1.4 * photoScale;
  const boxH = ch * PORTRAIT.h * 1.4 * photoScale;
  const cx = photoPos.x * cw;
  const cy = photoPos.y * ch;
  return Math.abs(px - cx) <= boxW / 2 && Math.abs(py - cy) <= boxH / 2;
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
    startX: number;
    startY: number;
    origScale: number;
    corner: PhotoCorner;
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
  const [history, setHistory] = useState<EditorHistory>(() => createHistory());
  const [canUndoState, setCanUndoState] = useState(false);
  const [canRedoState, setCanRedoState] = useState(false);
  const [selectedTextFill, setSelectedTextFill] = useState(NOTE_TEXT_DEFAULT_COLOR);
  const [selectedTextFont, setSelectedTextFont] = useState<string>(TEXT_FONTS[0].value);
  const [selectedTextSize, setSelectedTextSize] = useState(NOTE_TEXT_DEFAULT_SIZE);
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [layers, setLayers] = useState<LayerRow[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const historyRef = useRef(history);
  const restoringHistoryRef = useRef(false);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [photoPos, setPhotoPos] = useState<{ x: number; y: number }>({
    x: PORTRAIT.cx,
    y: PORTRAIT.cy,
  });
  const [photoScale, setPhotoScale] = useState(1.15);
  const [photoFlipX, setPhotoFlipX] = useState(false);
  const [photoAngle, setPhotoAngle] = useState(0);
  const [photoActive, setPhotoActive] = useState(false);
  const [textEditMode, setTextEditMode] = useState(true);
  const suppressClickRef = useRef(false);

  const photoSrcRef = useRef(photoSrc);
  const photoPosRef = useRef(photoPos);
  const photoScaleRef = useRef(photoScale);
  const photoActiveRef = useRef(photoActive);

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

  const captureComposeSnapshot = useCallback(async (): Promise<Blob | null> => {
    if (!composeRef.current) return null;

    fabricRef.current?.discardActiveObject();
    fabricRef.current?.requestRenderAll();

    const hideSelectors = [".note-compose__photo-hit", ".note-compose__photo-handles"];
    const hidden: { el: HTMLElement; visibility: string }[] = [];
    for (const sel of hideSelectors) {
      const el = composeRef.current.querySelector(sel);
      if (el instanceof HTMLElement) {
        hidden.push({ el, visibility: el.style.visibility });
        el.style.visibility = "hidden";
      }
    }

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
      const res = await fetch(dataURL);
      return await res.blob();
    } finally {
      for (const { el, visibility } of hidden) {
        el.style.visibility = visibility;
      }
      fabricRef.current?.requestRenderAll();
    }
  }, []);

  const scheduleCanvasSave = useCallback(() => {
    if (canvasSaveDebounceRef.current) clearTimeout(canvasSaveDebounceRef.current);
    canvasSaveDebounceRef.current = setTimeout(() => {
      void captureComposeSnapshot()
        .then((blob) => (blob ? uploadCanvasSnapshot(blob) : undefined))
        .catch(() => {});
    }, 1800);
  }, [captureComposeSnapshot]);

  const scheduleCanvasSaveRef = useRef(scheduleCanvasSave);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    photoSrcRef.current = photoSrc;
    photoPosRef.current = photoPos;
    photoScaleRef.current = photoScale;
    photoActiveRef.current = photoActive;
  }, [photoSrc, photoPos, photoScale, photoActive]);

  useEffect(() => {
    scheduleCanvasSaveRef.current = scheduleCanvasSave;
  }, [scheduleCanvasSave]);

  const syncTextCount = useCallback((c: fabric.Canvas) => {
    setTextCount(c.getObjects().filter((o) => o.type === "i-text").length);
  }, []);

  const syncHistoryFlags = useCallback((h: EditorHistory) => {
    setCanUndoState(canUndo(h));
    setCanRedoState(canRedo(h));
  }, []);

  const commitHistory = useCallback(
    (fc?: fabric.Canvas | null) => {
      const canvas = fc ?? fabricRef.current;
      if (!canvas || restoringHistoryRef.current) return;
      const next = pushHistory(historyRef.current, canvas);
      historyRef.current = next;
      setHistory(next);
      syncHistoryFlags(next);
    },
    [syncHistoryFlags],
  );

  const refreshLayers = useCallback(() => {
    const fc = fabricRef.current;
    setLayers(buildLayerRows(fc, !!photoSrc));
    setSelectedLayerId(getSelectedLayerId(fc, photoActive));
  }, [photoSrc, photoActive]);

  const syncTextSelection = useCallback(
    (fc: fabric.Canvas) => {
      const text = getActiveText(fc);
      if (text) {
        applyTextControlDefaults(text);
        setHasTextSelection(true);
        setSelectedTextFill((text.fill as string) || NOTE_TEXT_DEFAULT_COLOR);
        setSelectedTextFont((text.fontFamily as string) || TEXT_FONTS[0].value);
        setSelectedTextSize(Math.round(text.fontSize ?? NOTE_TEXT_DEFAULT_SIZE));
      } else {
        setHasTextSelection(false);
      }
      setSelectedLayerId(getSelectedLayerId(fc, photoActive));
      setLayers(buildLayerRows(fc, !!photoSrc));
    },
    [photoSrc, photoActive],
  );

  const handleUndo = useCallback(async () => {
    const fc = fabricRef.current;
    if (!fc || !canUndo(historyRef.current)) return;
    restoringHistoryRef.current = true;
    const next = await restoreHistory(fc, historyRef.current, historyRef.current.index - 1);
    historyRef.current = next;
    setHistory(next);
    syncHistoryFlags(next);
    syncTextCount(fc);
    syncTextSelection(fc);
    restoringHistoryRef.current = false;
  }, [syncHistoryFlags, syncTextCount, syncTextSelection]);

  const handleRedo = useCallback(async () => {
    const fc = fabricRef.current;
    if (!fc || !canRedo(historyRef.current)) return;
    restoringHistoryRef.current = true;
    const next = await restoreHistory(fc, historyRef.current, historyRef.current.index + 1);
    historyRef.current = next;
    setHistory(next);
    syncHistoryFlags(next);
    syncTextCount(fc);
    syncTextSelection(fc);
    restoringHistoryRef.current = false;
  }, [syncHistoryFlags, syncTextCount, syncTextSelection]);

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
      const canvas = new fabric.Canvas(el, {
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: "transparent",
        selection: false,
        preserveObjectStacking: true,
        targetFindTolerance: 14,
        perPixelTargetFind: true,
        selectionColor: FABRIC_SEL_TINT,
        selectionBorderColor: FABRIC_ACCENT,
      });
      fabricRef.current = canvas;
      fc = canvas;
      disableCanvasDragSelection(canvas);
      seedDefaultNoteText(canvas);
      migrateDefaultNameSlot(canvas);

      const onChange = () => {
        syncTextCount(canvas);
        syncTextSelection(canvas);
      };

      const blockSelectionIfPhotoMode = () => {
        if (photoActiveRef.current) {
          clearFabricSelection(canvas);
          return true;
        }
        return false;
      };

      canvas.on("selection:created", () => {
        if (blockSelectionIfPhotoMode()) return;
        onChange();
      });
      canvas.on("selection:updated", () => {
        if (blockSelectionIfPhotoMode()) return;
        onChange();
      });
      canvas.on("selection:cleared", () => {
        syncTextCount(canvas);
        setHasTextSelection(false);
      });
      canvas.on("object:added", () => {
        onChange();
        commitHistory(canvas);
      });
      canvas.on("object:removed", () => {
        onChange();
        commitHistory(canvas);
      });
      canvas.on("object:modified", (e) => {
        const target = e.target;
        if (isFabricText(target)) {
          if (normalizeTextScale(target)) {
            setSelectedTextSize(Math.round(target.fontSize ?? NOTE_TEXT_DEFAULT_SIZE));
          }
        }
        refreshLayers();
        if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
        historyDebounceRef.current = setTimeout(() => commitHistory(canvas), 400);
        scheduleCanvasSaveRef.current();
      });
      canvas.on("text:changed", () => {
        refreshLayers();
        scheduleCanvasSaveRef.current();
      });

      canvas.on("mouse:down", (opt) => {
        const target = opt.target;
        if (target && isFabricText(target)) {
          setPhotoActive(false);
          setTextEditMode(true);
          return;
        }
        if (!target && photoSrcRef.current) {
          const pointer = canvas.getScenePoint(opt.e);
          if (
            pointerInPhotoZone(
              pointer.x,
              pointer.y,
              canvas.getWidth(),
              canvas.getHeight(),
              photoPosRef.current,
              photoScaleRef.current,
            )
          ) {
            setPhotoActive(true);
            setTextEditMode(false);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            setSelectedLayerId("photo");
            setHasTextSelection(false);
          }
        }
      });

      canvas.on("mouse:dblclick", (opt) => {
        const target = opt.target;
        if (target && isFabricText(target)) {
          setPhotoActive(false);
          setTextEditMode(true);
          canvas.setActiveObject(target);
          canvas.requestRenderAll();
          if ("enterEditing" in target && typeof target.enterEditing === "function") {
            target.enterEditing();
          }
          syncTextSelection(canvas);
          return;
        }
        if (!target) {
          const pointer = canvas.getScenePoint(opt.e);
          const inPhoto =
            photoSrcRef.current &&
            pointerInPhotoZone(
              pointer.x,
              pointer.y,
              canvas.getWidth(),
              canvas.getHeight(),
              photoPosRef.current,
              photoScaleRef.current,
            );
          if (!inPhoto) {
            setPhotoActive(false);
            setTextEditMode(true);
            setSelectedLayerId(null);
            setHasTextSelection(false);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
          }
        }
      });

      clearFabricSelection(canvas);
      commitHistory(canvas);
    } else {
      fc.setDimensions({ width: dimensions.width, height: dimensions.height });
      disableCanvasDragSelection(fc);
      migrateDefaultNameSlot(fc);
      if (photoActiveRef.current) clearFabricSelection(fc);
    }
    fc.requestRenderAll();
  }, [
    dimensions.width,
    dimensions.height,
    syncTextCount,
    syncTextSelection,
    commitHistory,
    refreshLayers,
  ]);

  useEffect(() => {
    if (dimensions.width < 100) return;
    scheduleCanvasSave();
  }, [
    photoSrc,
    photoPos,
    photoScale,
    photoFlipX,
    photoAngle,
    filters,
    dimensions.width,
    scheduleCanvasSave,
  ]);

  useEffect(() => {
    refreshLayers();
  }, [photoSrc, photoActive, refreshLayers]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPhotoActive(false);
        setTextEditMode(true);
        setSelectedLayerId(null);
        clearFabricSelection(fabricRef.current);
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo, handleRedo]);

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
        const { corner, startX, startY, origScale } = resizeRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let delta = 0;
        switch (corner) {
          case "se":
            delta = (dx + dy) / 2;
            break;
          case "nw":
            delta = (-dx - dy) / 2;
            break;
          case "ne":
            delta = (dx - dy) / 2;
            break;
          case "sw":
            delta = (-dx + dy) / 2;
            break;
        }
        setPhotoScale(clamp(origScale + delta / 200, 0.2, 4));
      }
    };
    const onUp = (e: PointerEvent) => {
      const wasDragging = dragRef.current?.pointerId === e.pointerId;
      if (wasDragging) dragRef.current = null;
      if (pendingDragRef.current?.pointerId === e.pointerId) pendingDragRef.current = null;
      if (resizeRef.current?.pointerId === e.pointerId) {
        suppressClickRef.current = true;
        resizeRef.current = null;
        scheduleCanvasSaveRef.current();
      } else if (wasDragging) {
        scheduleCanvasSaveRef.current();
      }
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
        setSelectedLayerId("photo");
        clearFabricSelection(fabricRef.current);
        showToast("Photo added — drag to move, corners to resize.", "success");
        setTimeout(() => {
          refreshLayers();
          scheduleCanvasSave();
        }, 400);
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const selectPhoto = useCallback(() => {
    setPhotoActive(true);
    setTextEditMode(false);
    clearFabricSelection(fabricRef.current);
    const fc = fabricRef.current;
    setSelectedLayerId("photo");
    setLayers(buildLayerRows(fc, !!photoSrc));
    setHasTextSelection(false);
  }, [photoSrc]);

  const deselectPhoto = useCallback(() => {
    setPhotoActive(false);
    setTextEditMode(true);
    setSelectedLayerId(null);
    setHasTextSelection(false);
  }, []);

  const enterTextEditing = useCallback(
    (text: fabric.IText) => {
      setPhotoActive(false);
      setTextEditMode(true);
      const fc = fabricRef.current;
      if (!fc) return;
      fc.setActiveObject(text);
      fc.requestRenderAll();
      if ("enterEditing" in text && typeof text.enterEditing === "function") {
        text.enterEditing();
      }
      syncTextSelection(fc);
    },
    [syncTextSelection],
  );

  useEffect(() => {
    if (photoActive) clearFabricSelection(fabricRef.current);
  }, [photoActive]);

  const handleLayerSelect = useCallback(
    (id: string) => {
      if (id === "photo") {
        selectPhoto();
        return;
      }
      const fc = fabricRef.current;
      if (!fc) return;
      const obj = findTextByLayerId(fc, id);
      if (!obj) return;
      setPhotoActive(false);
      setTextEditMode(true);
      fc.setActiveObject(obj);
      fc.requestRenderAll();
      syncTextSelection(fc);
    },
    [selectPhoto, syncTextSelection],
  );

  const handleLayerReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      const fc = fabricRef.current;
      if (!fc) return;
      reorderTextLayers(fc, fromIndex, toIndex);
      fc.requestRenderAll();
      commitHistory(fc);
      refreshLayers();
    },
    [commitHistory, refreshLayers],
  );

  const handleLayerTextChange = useCallback(
    (layerId: string, newText: string) => {
      const fc = fabricRef.current;
      if (!fc) return;
      const obj = findTextByLayerId(fc, layerId);
      if (!obj) return;
      obj.set("text", newText || "Text");
      obj.setCoords();
      fc.requestRenderAll();
      commitHistory(fc);
      refreshLayers();
      if (getSelectedLayerId(fc, photoActive) === layerId) {
        syncTextSelection(fc);
      }
    },
    [commitHistory, refreshLayers, photoActive, syncTextSelection],
  );

  const handlePhotoHitPointerDown = (e: React.PointerEvent) => {
    if (!photoSrc || resizeRef.current) return;
    if ((e.target as HTMLElement).closest(".note-compose__resize-handle")) return;

    e.stopPropagation();
    e.preventDefault();

    selectPhoto();
    suppressClickRef.current = false;
    dragRef.current = null;

    pendingDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: photoPos.x,
      origY: photoPos.y,
    };
  };

  const handleResizePointerDown = (e: React.PointerEvent, corner: PhotoCorner) => {
    if (!photoSrc) return;
    e.stopPropagation();
    e.preventDefault();
    selectPhoto();
    dragRef.current = null;
    pendingDragRef.current = null;
    resizeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origScale: photoScale,
      corner,
    };
  };

  const handlePhotoWheel = (e: React.WheelEvent) => {
    if (!photoSrc) return;
    e.stopPropagation();
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    setPhotoScale((s) => clamp(s + delta, 0.2, 4));
  };

  const applyTextStyle = useCallback(
    (patch: { fill?: string; fontFamily?: string; fontSize?: number }) => {
      const fc = fabricRef.current;
      if (!fc) return;
      const text = getActiveText(fc);
      if (!text) return;
      if (patch.fill !== undefined) text.set("fill", patch.fill);
      if (patch.fontFamily !== undefined) text.set("fontFamily", patch.fontFamily);
      if (patch.fontSize !== undefined) {
        text.set({
          fontSize: clamp(patch.fontSize, 8, 240),
          scaleX: 1,
          scaleY: 1,
        });
      }
      text.setCoords();
      fc.requestRenderAll();
      commitHistory(fc);
      syncTextSelection(fc);
    },
    [commitHistory, syncTextSelection],
  );

  const handleEditSelectedText = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const text = getActiveText(fc);
    if (!text) return;
    enterTextEditing(text);
  };

  const handleAddText = () => {
    setPhotoActive(false);
    setTextEditMode(true);
    const fc = fabricRef.current;
    if (!fc) return;
    const size = NOTE_TEXT_DEFAULT_SIZE;
    const text = new fabric.IText("Your Name", {
      left: fc.getWidth() / 2,
      top: fc.getHeight() * 0.12,
      originX: "center",
      originY: "center",
      fontFamily: selectedTextFont,
      fontSize: size,
      fontWeight: "bold",
      fill: selectedTextFill,
    });
    applyTextControlDefaults(text);
    setSelectedTextSize(size);
    ensureLayerId(text);
    fc.add(text);
    fc.setActiveObject(text);
    fc.requestRenderAll();
    syncTextSelection(fc);
    if ("enterEditing" in text && typeof text.enterEditing === "function") {
      text.enterEditing();
    }
    showToast("Type your text — drag corners to resize, or use Text size in sidebar.", "success");
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
      commitHistory(fc);
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
    setTextEditMode(true);
    const fc = fabricRef.current;
    if (fc) {
      fc.getObjects().forEach((o) => fc.remove(o));
      fc.discardActiveObject();
      seedDefaultNoteText(fc);
      fc.requestRenderAll();
      const h = pushHistory(createHistory(), fc);
      historyRef.current = h;
      setHistory(h);
      syncHistoryFlags(h);
      syncTextCount(fc);
      setHasTextSelection(false);
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
    showToast("Saving your image...", "loading");

    setPhotoActive(false);
    await new Promise((r) => setTimeout(r, 50));

    try {
      const blob = await captureComposeSnapshot();
      if (!blob) throw new Error("capture failed");

      try {
        const result = await saveDesign(blob, userEmail);
        setMintResult(result);
        fetch("/api/users/record-mint", { method: "POST" }).catch(() => {});
        showToast("Design saved! Choose preview or unlock HD.", "success", 4000);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          showToast(err.message, "error", 6000);
          return;
        }
        const dataURL = URL.createObjectURL(blob);
        downloadLocalPng(dataURL);
        URL.revokeObjectURL(dataURL);
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
      setIsDownloading(false);
      setToast((t) => (t?.type === "loading" ? null : t));
    }
  };

  const canTransformPhoto = photoActive && !!photoSrc;
  const photoEditing = !!photoSrc && photoActive;
  const photoTransform = `scaleX(${photoFlipX ? -1 : 1}) rotate(${photoAngle}deg)`;
  const photoBoxSize = {
    width: `${PORTRAIT.w * 140}%`,
    height: `${PORTRAIT.h * 140}%`,
  };
  const photoFrameStyle: React.CSSProperties = {
    position: "absolute",
    left: `${photoPos.x * 100}%`,
    top: `${photoPos.y * 100}%`,
    width: photoBoxSize.width,
    height: photoBoxSize.height,
    transform: "translate(-50%, -50%)",
    visibility: photoSrc ? "visible" : "hidden",
  };
  const photoScaledStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    transform: `scale(${photoScale})`,
    transformOrigin: "center center",
  };
  const handleSizeFix = (corner: PhotoCorner): React.CSSProperties => ({
    transform: `scale(${1 / photoScale})`,
    transformOrigin:
      corner === "nw"
        ? "top left"
        : corner === "ne"
          ? "top right"
          : corner === "sw"
            ? "bottom left"
            : "bottom right",
  });

  const handleComposeDoubleClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest(".note-compose__photo-hit") || t.closest(".note-compose__resize-handle")) return;
    deselectPhoto();
    fabricRef.current?.discardActiveObject();
    fabricRef.current?.requestRenderAll();
  };

  return (
    <div className="editor-workspace">
      <section className="editor-preview-panel" aria-label="Dollar bill preview">
        <div className="editor-preview-header">
          <p className="editor-preview-label">Live preview</p>
          <div className="editor-history-actions">
            <button
              type="button"
              className="editor-history-btn"
              onClick={handleUndo}
              disabled={!canUndoState}
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={16} />
              Undo
            </button>
            <button
              type="button"
              className="editor-history-btn"
              onClick={handleRedo}
              disabled={!canRedoState}
              aria-label="Redo"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={16} />
              Redo
            </button>
          </div>
        </div>
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
              if (t.closest(".note-compose__photo-hit") || t.closest(".note-compose__resize-handle")) return;
            }}
            onDoubleClick={handleComposeDoubleClick}
            style={{
              width: dimensions.width || undefined,
              height: dimensions.height || undefined,
              background: PAPER_BG,
            }}
          >
            {/* Layer order is fixed — never mount/unmount around Fabric canvas (prevents insertBefore crash) */}
            <div
              className="note-compose__photo-visual"
              style={{ ...photoFrameStyle, zIndex: 1, pointerEvents: "none" }}
              aria-hidden
            >
              <div style={photoScaledStyle}>
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
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NOTE_SRC}
              alt=""
              className="note-compose__note"
              draggable={false}
            />

            {/* MINT MY FACE watermark is added on the server when you save — not shown here so the editor stays clean */}

            <div
              className="note-compose__photo-frame"
              style={{
                ...photoFrameStyle,
                zIndex: photoEditing ? 12 : 8,
              }}
            >
              <div
                className={`note-compose__photo-hit${photoActive ? " note-compose__photo-hit--active" : ""}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  ...photoScaledStyle,
                  pointerEvents: photoSrc ? "auto" : "none",
                }}
                onPointerDown={handlePhotoHitPointerDown}
                onWheel={handlePhotoWheel}
                onClick={(e) => e.stopPropagation()}
                role="presentation"
                tabIndex={-1}
                aria-hidden={!photoSrc}
                aria-label="Your photo — click to select, drag to move, scroll to resize"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") selectPhoto();
                }}
              />
              {photoActive && photoSrc ? (
                <div className="note-compose__photo-handles" style={photoScaledStyle}>
                  {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                    <span
                      key={corner}
                      style={handleSizeFix(corner)}
                      className={`note-compose__resize-handle note-compose__resize-handle--${corner}`}
                      onPointerDown={(e) => handleResizePointerDown(e, corner)}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <canvas ref={textCanvasRef} className="note-compose__text-layer note-compose__text-layer--interactive" />
          </div>
        </div>
        <p className="editor-preview-footer">
          Double-click name or message to edit · click portrait to move photo · double-click canvas to exit photo mode
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

          <EditorLayersPanel
            layers={layers}
            selectedId={selectedLayerId}
            onSelect={handleLayerSelect}
            onReorderText={handleLayerReorder}
            onTextChange={handleLayerTextChange}
            onEditTextLayer={(id) => {
              handleLayerSelect(id);
              setTimeout(() => handleEditSelectedText(), 0);
            }}
          />

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
            {hasTextSelection ? (
              <div className="editor-text-style" style={{ marginTop: "var(--space-sm)" }}>
                <button
                  type="button"
                  className="editor-tool-btn editor-tool-btn--primary"
                  style={{ width: "100%", marginBottom: "var(--space-sm)" }}
                  onClick={handleEditSelectedText}
                >
                  <Keyboard size={18} />
                  Edit text on note
                </button>
                <FilterSlider
                  label="Text size"
                  min={8}
                  max={120}
                  value={selectedTextSize}
                  onChange={(v) => {
                    setSelectedTextSize(v);
                    applyTextStyle({ fontSize: v });
                  }}
                  unit="px"
                />
                <div className="editor-text-size-btns">
                  <button
                    type="button"
                    className="editor-tool-btn"
                    onClick={() => {
                      const next = clamp(selectedTextSize - 4, 8, 240);
                      setSelectedTextSize(next);
                      applyTextStyle({ fontSize: next });
                    }}
                  >
                    <ZoomOut size={16} /> Smaller
                  </button>
                  <button
                    type="button"
                    className="editor-tool-btn"
                    onClick={() => {
                      const next = clamp(selectedTextSize + 4, 8, 240);
                      setSelectedTextSize(next);
                      applyTextStyle({ fontSize: next });
                    }}
                  >
                    <ZoomIn size={16} /> Bigger
                  </button>
                </div>
                <div className="editor-text-style__row">
                  <label htmlFor="text-font">Font style</label>
                  <select
                    id="text-font"
                    value={selectedTextFont}
                    onChange={(e) => {
                      setSelectedTextFont(e.target.value);
                      applyTextStyle({ fontFamily: e.target.value });
                    }}
                  >
                    {TEXT_FONTS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="editor-text-style__row">
                  <label htmlFor="text-color">Text color</label>
                  <input
                    id="text-color"
                    type="color"
                    value={selectedTextFill}
                    onChange={(e) => {
                      setSelectedTextFill(e.target.value);
                      applyTextStyle({ fill: e.target.value });
                    }}
                  />
                  <div className="editor-text-colors">
                    {TEXT_COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`editor-text-color-swatch${selectedTextFill.toLowerCase() === c ? " editor-text-color-swatch--active" : ""}`}
                        style={{ background: c }}
                        aria-label={`Color ${c}`}
                        onClick={() => {
                          setSelectedTextFill(c);
                          applyTextStyle({ fill: c });
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="editor-photo-hint">
                  Drag corner handles to resize · double-click or use Edit text to type inside.
                </p>
              </div>
            ) : (
              <p className="editor-photo-hint">
                Add text, then click it to resize, edit wording, font &amp; color.
              </p>
            )}
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
            {isDownloading ? "Saving…" : "SAVE IMAGE"}
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
