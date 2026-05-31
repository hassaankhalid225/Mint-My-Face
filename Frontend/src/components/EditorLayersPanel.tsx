"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical, ImageIcon, Type, Layers } from "lucide-react";
import type { LayerRow } from "@/lib/editor-layers";

type EditorLayersPanelProps = {
  layers: LayerRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorderText: (fromIndex: number, toIndex: number) => void;
  onTextChange: (layerId: string, text: string) => void;
  onEditTextLayer: (layerId: string) => void;
};

export default function EditorLayersPanel({
  layers,
  selectedId,
  onSelect,
  onReorderText,
  onTextChange,
  onEditTextLayer,
}: EditorLayersPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const textIndices = layers
    .map((l, i) => (l.kind === "text" ? i : -1))
    .filter((i) => i >= 0);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startEditing = (layer: LayerRow) => {
    if (layer.kind !== "text") return;
    onSelect(layer.id);
    setEditingId(layer.id);
    setEditValue(layer.label === "Text" ? "" : layer.label);
  };

  const commitEdit = (layerId: string) => {
    const value = editValue.trim() || "Text";
    onTextChange(layerId, value);
    setEditingId(null);
  };

  const handleDragStart = (index: number, layer: LayerRow) => {
    if (layer.kind !== "text" || editingId) return;
    setDragIndex(index);
    setDropIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number, layer: LayerRow) => {
    if (layer.kind !== "text" || dragIndex === null) return;
    e.preventDefault();
    setDropIndex(index);
  };

  const handleDrop = (index: number, layer: LayerRow) => {
    if (layer.kind !== "text" || dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const fromText = textIndices.indexOf(dragIndex);
    const toText = textIndices.indexOf(index);
    if (fromText >= 0 && toText >= 0 && fromText !== toText) {
      onReorderText(fromText, toText);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  if (layers.length === 0) {
    return (
      <div className="editor-tool-section">
        <h3>
          <Layers size={16} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
          Layers
        </h3>
        <p className="editor-photo-hint">Upload a photo or add text — items appear here.</p>
      </div>
    );
  }

  return (
    <div className="editor-tool-section">
      <h3>
        <Layers size={16} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
        Layers
      </h3>
      <p className="editor-layers-hint">
        Double-click name to edit · corners resize photo when selected
      </p>
      <ul className="editor-layers-list" role="listbox" aria-label="Design layers">
        {layers.map((layer, index) => {
          const isSelected = selectedId === layer.id;
          const isDragging = dragIndex === index;
          const isDropTarget = dropIndex === index && dragIndex !== null && dragIndex !== index;
          const isEditing = editingId === layer.id;
          const Icon = layer.kind === "photo" ? ImageIcon : Type;

          return (
            <li
              key={layer.id}
              role="option"
              aria-selected={isSelected}
              className={`editor-layer-item${isSelected ? " editor-layer-item--active" : ""}${isDragging ? " editor-layer-item--dragging" : ""}${isDropTarget ? " editor-layer-item--drop-target" : ""}`}
              draggable={layer.draggable && !isEditing}
              onDragStart={() => handleDragStart(index, layer)}
              onDragOver={(e) => handleDragOver(e, index, layer)}
              onDrop={() => handleDrop(index, layer)}
              onDragEnd={handleDragEnd}
            >
              {layer.draggable ? (
                <span className="editor-layer-item__grip" aria-hidden>
                  <GripVertical size={14} />
                </span>
              ) : (
                <span className="editor-layer-item__grip editor-layer-item__grip--spacer" />
              )}

              {layer.kind === "text" && isEditing ? (
                <input
                  ref={editInputRef}
                  type="text"
                  className="editor-layer-item__input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(layer.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitEdit(layer.id);
                    }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Edit text on note"
                />
              ) : (
                <button
                  type="button"
                  className="editor-layer-item__btn"
                  onClick={() => onSelect(layer.id)}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    if (layer.kind === "text") {
                      startEditing(layer);
                      onEditTextLayer(layer.id);
                    }
                  }}
                >
                  <Icon size={16} className="editor-layer-item__icon" />
                  <span className="editor-layer-item__label">{layer.label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
