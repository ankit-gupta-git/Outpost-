import { T, uniqueId, type RecordProps, type TLShape } from "tldraw";

// The ERD table shape's type, props and layout math. No React here, so the agent's canvas tools
// (lib/agent-canvas.ts) can use it too. Keep the props in sync with tldraw-sync/src/TldrawRoom.ts,
// which validates every change on the sync server.

export const ENTITY_TABLE_TYPE = "entity-table";

export type EntityRow = {
  id: string;
  name: string;
  dataType: string;
  isPK: boolean;
  isFK: boolean;
};

type EntityTableProps = {
  w: number;
  h: number;
  tableName: string;
  rows: EntityRow[];
};

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [ENTITY_TABLE_TYPE]: EntityTableProps;
  }
}

export type EntityTableShape = TLShape<typeof ENTITY_TABLE_TYPE>;

export const entityTableProps: RecordProps<EntityTableShape> = {
  w: T.number,
  h: T.number,
  tableName: T.string,
  rows: T.arrayOf(
    T.object({ id: T.string, name: T.string, dataType: T.string, isPK: T.boolean, isFK: T.boolean })
  ),
};

export const TABLE_WIDTH = 260;
export const MIN_TABLE_WIDTH = 180;
export const HEADER_HEIGHT = 40;
export const ROW_HEIGHT = 32;
// An empty table still shows one row's worth of space, so it never collapses to just a header.
const EMPTY_BODY_HEIGHT = ROW_HEIGHT;

export function getTableHeight(rowCount: number) {
  return HEADER_HEIGHT + (rowCount === 0 ? EMPTY_BODY_HEIGHT : rowCount * ROW_HEIGHT);
}

// Vertical center of a row, normalized to the table's height (0 = top, 1 = bottom), which is
// what tldraw arrow bindings use for their anchor.
export function rowAnchorY(index: number, rowCount: number) {
  return (HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2) / getTableHeight(rowCount);
}

// Which row a normalized y falls on, or -1 for the header.
export function rowIndexAt(normalizedY: number, rowCount: number) {
  const y = normalizedY * getTableHeight(rowCount);
  if (y < HEADER_HEIGHT || rowCount === 0) return -1;
  return Math.min(rowCount - 1, Math.floor((y - HEADER_HEIGHT) / ROW_HEIGHT));
}

export function newRow(column: { name: string; dataType: string; isPK?: boolean; isFK?: boolean }): EntityRow {
  return {
    id: uniqueId(),
    name: column.name,
    dataType: column.dataType,
    isPK: column.isPK ?? false,
    isFK: column.isFK ?? false,
  };
}
