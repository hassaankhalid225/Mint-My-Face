import type { Canvas } from "fabric";

const MAX_HISTORY = 50;

export type EditorHistory = {
  stack: string[];
  index: number;
};

export function createHistory(): EditorHistory {
  return { stack: [], index: -1 };
}

export function canUndo(h: EditorHistory): boolean {
  return h.index > 0;
}

export function canRedo(h: EditorHistory): boolean {
  return h.index >= 0 && h.index < h.stack.length - 1;
}

export function pushHistory(h: EditorHistory, canvas: Canvas): EditorHistory {
  const json = JSON.stringify(canvas.toJSON());
  let stack = h.index >= 0 ? h.stack.slice(0, h.index + 1) : [];
  stack.push(json);
  if (stack.length > MAX_HISTORY) {
    stack = stack.slice(stack.length - MAX_HISTORY);
  }
  return { stack, index: stack.length - 1 };
}

export async function restoreHistory(
  canvas: Canvas,
  h: EditorHistory,
  targetIndex: number,
): Promise<EditorHistory> {
  if (targetIndex < 0 || targetIndex >= h.stack.length) return h;
  await canvas.loadFromJSON(JSON.parse(h.stack[targetIndex]));
  canvas.requestRenderAll();
  return { ...h, index: targetIndex };
}
