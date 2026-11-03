"use client";

import { TldrawUiMenuItem, createShapeId, useEditor, useValue } from "tldraw";
import { Table2 } from "lucide-react";
import { ENTITY_TABLE_TYPE, TABLE_WIDTH, getTableHeight } from "./EntityTableShape";

// Toolbar button: drops a new ERD table in the middle of the viewport and opens it for editing.
export function AddEntityTableButton() {
  const editor = useEditor();
  const isReadonly = useValue("isReadonly", () => editor.getIsReadonly(), [editor]);

  return (
    <TldrawUiMenuItem
      id="add-entity-table"
      label="Add table"
      icon={
        <div className="flex items-center justify-center">
          <Table2 size={18} strokeWidth={1.75} />
        </div>
      }
      disabled={isReadonly}
      onSelect={() => {
        const id = createShapeId();
        const center = editor.getViewportPageBounds().center;
        editor.markHistoryStoppingPoint("add entity table");
        editor.createShape({
          id,
          type: ENTITY_TABLE_TYPE,
          x: center.x - TABLE_WIDTH / 2,
          y: center.y - getTableHeight(1) / 2,
        });
        editor.select(id);
        editor.setEditingShape(id);
      }}
    />
  );
}
