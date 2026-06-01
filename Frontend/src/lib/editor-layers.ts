import type { ActiveSelection, IText, Canvas, FabricObject } from "fabric";

export type LayerRow =
  | { kind: "photo"; id: "photo"; label: string; draggable: false }
  | { kind: "text"; id: string; label: string; draggable: true };

const layerIdMap = new WeakMap<FabricObject, string>();

export function ensureLayerId(obj: FabricObject): string {
  let id = layerIdMap.get(obj);
  if (!id) {
    id = `text-${crypto.randomUUID().slice(0, 8)}`;
    layerIdMap.set(obj, id);
  }
  return id;
}

export function registerLayerId(obj: FabricObject, id: string): void {
  layerIdMap.set(obj, id);
}

export function getTextLabel(obj: IText): string {
  const id = layerIdMap.get(obj);
  const raw = (obj.text || "").replace(/\n/g, " ").trim();
  if (!raw) {
    if (id === "text-name") return "Your name";
    if (id === "text-body") return "Your message";
  }
  return raw.length > 28 ? `${raw.slice(0, 28)}…` : raw || "Text";
}

/** Front (top of list) → back (bottom). */
export function buildLayerRows(
  canvas: Canvas | null,
  hasPhoto: boolean,
): LayerRow[] {
  const rows: LayerRow[] = [];
  if (!canvas) {
    if (hasPhoto) rows.push({ kind: "photo", id: "photo", label: "Portrait photo", draggable: false });
    return rows;
  }

  const texts = canvas.getObjects().filter((o) => o.type === "i-text") as IText[];
  [...texts].reverse().forEach((t) => {
    rows.push({
      kind: "text",
      id: ensureLayerId(t),
      label: getTextLabel(t),
      draggable: true,
    });
  });

  if (hasPhoto) {
    rows.push({ kind: "photo", id: "photo", label: "Portrait photo", draggable: false });
  }

  return rows;
}

export function findTextByLayerId(canvas: Canvas, layerId: string): IText | null {
  const texts = canvas.getObjects().filter((o) => o.type === "i-text") as IText[];
  return texts.find((t) => ensureLayerId(t) === layerId) ?? null;
}

export function reorderTextLayers(
  canvas: Canvas,
  fromUiIndex: number,
  toUiIndex: number,
): void {
  const texts = canvas.getObjects().filter((o) => o.type === "i-text") as IText[];
  if (texts.length < 2) return;

  const frontFirst = [...texts].reverse();
  if (
    fromUiIndex < 0 ||
    toUiIndex < 0 ||
    fromUiIndex >= frontFirst.length ||
    toUiIndex >= frontFirst.length
  ) {
    return;
  }

  const [moved] = frontFirst.splice(fromUiIndex, 1);
  frontFirst.splice(toUiIndex, 0, moved);

  const backToFront = [...frontFirst].reverse();
  backToFront.forEach((obj, index) => {
    canvas.moveObjectTo(obj, index);
  });
}

export function getSelectedLayerId(
  canvas: Canvas | null,
  photoActive: boolean,
): string | null {
  if (photoActive) return "photo";
  if (!canvas) return null;
  const active = canvas.getActiveObject();
  if (active?.type === "i-text") return ensureLayerId(active);
  if (active?.type === "activeselection") {
    const sel = active as ActiveSelection;
    const first = sel.getObjects().find((o) => o.type === "i-text");
    if (first) return ensureLayerId(first);
  }
  return null;
}
