import {
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  resizeBox,
  stopEventPropagation,
  useEditor,
  useIsEditing,
  type TLResizeInfo,
} from "tldraw";
import { KeyRound, Link2, Plus, X } from "lucide-react";
import {
  ENTITY_TABLE_TYPE,
  HEADER_HEIGHT,
  MIN_TABLE_WIDTH,
  ROW_HEIGHT,
  TABLE_WIDTH,
  entityTableProps,
  getTableHeight,
  newRow,
  type EntityRow,
  type EntityTableShape,
} from "./EntityTableShape";

// Shared by the live component and the SVG export (PDF/PNG), so both look the same.
const COLORS = {
  body: "#18181b",
  header: "#27272a",
  border: "#3f3f46",
  divider: "#27272a",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  pk: "#f59e0b",
  fk: "#38bdf8",
};
const FONT = "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif";
const RADIUS = 8;

// An ERD table: a header with the table name, then one row per column with PK/FK badges.
// Select and drag it like any shape; double-click to edit the name and columns in place.
export class EntityTableShapeUtil extends ShapeUtil<EntityTableShape> {
  static override type = ENTITY_TABLE_TYPE;
  static override props = entityTableProps;

  getDefaultProps(): EntityTableShape["props"] {
    const rows = [newRow({ name: "id", dataType: "uuid", isPK: true })];
    return { w: TABLE_WIDTH, h: getTableHeight(rows.length), tableName: "table", rows };
  }

  // Height always follows the row count, so it can't drift from what's rendered.
  getGeometry(shape: EntityTableShape) {
    return new Rectangle2d({ width: shape.props.w, height: getTableHeight(shape.props.rows.length), isFilled: true });
  }

  override canEdit() {
    return true;
  }

  override canResize() {
    return true;
  }

  // Only the width is resizable; the height is set by the rows.
  override onResize(shape: EntityTableShape, info: TLResizeInfo<EntityTableShape>) {
    const resized = resizeBox(shape, info, { minWidth: MIN_TABLE_WIDTH });
    return { ...resized, y: shape.y, props: { ...resized.props, h: getTableHeight(shape.props.rows.length) } };
  }

  component(shape: EntityTableShape) {
    return <EntityTable shape={shape} />;
  }

  getIndicatorPath(shape: EntityTableShape) {
    const path = new Path2D();
    path.roundRect(0, 0, shape.props.w, getTableHeight(shape.props.rows.length), RADIUS);
    return path;
  }

  override toSvg(shape: EntityTableShape) {
    const { w, tableName, rows } = shape.props;
    const h = getTableHeight(rows.length);
    const typeX = w - 12;
    return (
      <g fontFamily={FONT}>
        <rect width={w} height={h} rx={RADIUS} fill={COLORS.body} stroke={COLORS.border} />
        <path
          d={`M0 ${RADIUS} a${RADIUS} ${RADIUS} 0 0 1 ${RADIUS} -${RADIUS} h${w - 2 * RADIUS} a${RADIUS} ${RADIUS} 0 0 1 ${RADIUS} ${RADIUS} v${HEADER_HEIGHT - RADIUS} h-${w} z`}
          fill={COLORS.header}
        />
        <line x1={0} x2={w} y1={HEADER_HEIGHT} y2={HEADER_HEIGHT} stroke={COLORS.border} />
        <text x={12} y={HEADER_HEIGHT / 2} dominantBaseline="central" fill={COLORS.text} fontSize={14} fontWeight={600}>
          {truncate(tableName, (w - 24) / 8)}
        </text>
        {rows.map((row, i) => {
          const y = HEADER_HEIGHT + i * ROW_HEIGHT;
          const cy = y + ROW_HEIGHT / 2;
          const badge = row.isPK ? "PK" : row.isFK ? "FK" : null;
          return (
            <g key={row.id}>
              {i > 0 && <line x1={0} x2={w} y1={y} y2={y} stroke={COLORS.divider} />}
              {badge && (
                <text x={12} y={cy} dominantBaseline="central" fontSize={10} fontWeight={700} fill={row.isPK ? COLORS.pk : COLORS.fk}>
                  {row.isPK && row.isFK ? "PK FK" : badge}
                </text>
              )}
              <text x={52} y={cy} dominantBaseline="central" fontSize={13} fill={COLORS.text}>
                {truncate(row.name, (w - 150) / 7)}
              </text>
              <text x={typeX} y={cy} dominantBaseline="central" textAnchor="end" fontSize={12} fill={COLORS.muted}>
                {truncate(row.dataType, 12)}
              </text>
            </g>
          );
        })}
      </g>
    );
  }
}

function truncate(text: string, maxChars: number) {
  const max = Math.max(3, Math.floor(maxChars));
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function EntityTable({ shape }: { shape: EntityTableShape }) {
  const editor = useEditor();
  const isEditing = useIsEditing(shape.id);
  const { w, tableName, rows } = shape.props;
  const h = getTableHeight(rows.length);

  const update = (props: Partial<EntityTableShape["props"]>) =>
    editor.updateShape<EntityTableShape>({ id: shape.id, type: ENTITY_TABLE_TYPE, props });
  const setRows = (next: EntityRow[]) => update({ rows: next, h: getTableHeight(next.length) });
  const updateRow = (id: string, patch: Partial<EntityRow>) =>
    setRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <HTMLContainer
      style={{ width: w, height: h, pointerEvents: isEditing ? "all" : "none", fontFamily: FONT }}
    >
      <div
        className="flex h-full flex-col overflow-hidden"
        style={{ background: COLORS.body, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS, color: COLORS.text }}
      >
        <div
          className="flex shrink-0 items-center px-3"
          style={{ height: HEADER_HEIGHT, background: COLORS.header, borderBottom: `1px solid ${COLORS.border}` }}
        >
          <Field
            editing={isEditing}
            value={tableName}
            placeholder="table_name"
            onChange={(value) => update({ tableName: value })}
            className="text-sm font-semibold"
          />
        </div>

        {rows.length === 0 && (
          <div className="flex items-center px-3 text-xs italic" style={{ height: ROW_HEIGHT, color: COLORS.muted }}>
            No columns
          </div>
        )}

        {rows.map((row, i) => (
          <div
            key={row.id}
            className="flex shrink-0 items-center gap-2 px-3"
            style={{ height: ROW_HEIGHT, borderTop: i > 0 ? `1px solid ${COLORS.divider}` : undefined }}
          >
            <div className="flex w-[34px] shrink-0 items-center gap-0.5">
              <KeyBadge
                kind="PK"
                active={row.isPK}
                editing={isEditing}
                onToggle={() => updateRow(row.id, { isPK: !row.isPK })}
              />
              <KeyBadge
                kind="FK"
                active={row.isFK}
                editing={isEditing}
                onToggle={() => updateRow(row.id, { isFK: !row.isFK })}
              />
            </div>
            <Field
              editing={isEditing}
              value={row.name}
              placeholder="column"
              onChange={(value) => updateRow(row.id, { name: value })}
              className="min-w-0 flex-1 text-[13px]"
            />
            <Field
              editing={isEditing}
              value={row.dataType}
              placeholder="type"
              onChange={(value) => updateRow(row.id, { dataType: value })}
              className="w-[84px] shrink-0 text-right text-xs"
              style={{ color: COLORS.muted }}
            />
            {isEditing && (
              <button
                type="button"
                title="Remove column"
                onPointerDown={stopEventPropagation}
                onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
                className="shrink-0 rounded p-0.5 hover:bg-white/10"
                style={{ color: COLORS.muted }}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Sits just below the table so it doesn't change the shape's bounds. */}
      {isEditing && (
        <button
          type="button"
          onPointerDown={stopEventPropagation}
          onClick={() => setRows([...rows, newRow({ name: `column_${rows.length + 1}`, dataType: "text" })])}
          className="absolute left-0 flex w-full items-center justify-center gap-1 rounded-md py-1 text-xs hover:bg-white/10"
          style={{ top: h + 6, color: COLORS.muted, border: `1px dashed ${COLORS.border}`, background: COLORS.body }}
        >
          <Plus className="size-3.5" /> Add column
        </button>
      )}
    </HTMLContainer>
  );
}

function Field({
  editing,
  value,
  placeholder,
  onChange,
  className,
  style,
}: {
  editing: boolean;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!editing) {
    return (
      <span className={`truncate ${className ?? ""}`} style={style}>
        {value || <span style={{ color: COLORS.muted }}>{placeholder}</span>}
      </span>
    );
  }
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onPointerDown={stopEventPropagation}
      // Keep typing out of tldraw's shortcuts (Backspace would delete the shape). Escape still
      // reaches tldraw, so it ends editing as usual.
      onKeyDown={(e) => {
        if (e.key !== "Escape") e.stopPropagation();
      }}
      className={`rounded bg-transparent px-1 -mx-1 outline-none focus:bg-white/10 ${className ?? ""}`}
      style={style}
    />
  );
}

function KeyBadge({
  kind,
  active,
  editing,
  onToggle,
}: {
  kind: "PK" | "FK";
  active: boolean;
  editing: boolean;
  onToggle: () => void;
}) {
  const color = kind === "PK" ? COLORS.pk : COLORS.fk;
  const Icon = kind === "PK" ? KeyRound : Link2;
  if (!active && !editing) return <span className="size-4" />;
  return (
    <button
      type="button"
      title={`${active ? "Unset" : "Set"} ${kind === "PK" ? "primary key" : "foreign key"}`}
      disabled={!editing}
      onPointerDown={stopEventPropagation}
      onClick={onToggle}
      className="flex size-4 items-center justify-center rounded disabled:cursor-default"
      style={{ color, opacity: active ? 1 : 0.3 }}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
