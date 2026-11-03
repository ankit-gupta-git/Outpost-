import { getArrowBindings, type Editor, type TLArrowBinding, type TLArrowShape, type TLEventInfo } from "tldraw";
import { ENTITY_TABLE_TYPE, rowAnchorY, rowIndexAt, type EntityTableShape } from "./EntityTableShape";

// When an arrow end lands on an ERD table, move its anchor to the row it was dropped on: the
// row's vertical center, on the table's side facing the arrow's other end. That way the arrow
// meets the table edge exactly at the column it refers to, and stays there when tables move.
export function snapArrowBindingToRow(editor: Editor, binding: TLArrowBinding) {
  // While the user is still dragging the arrow end, tldraw keeps rewriting the binding, so wait
  // for the pointer to come up and snap whatever binding is there then.
  if (!editor.inputs.getIsPointing()) {
    snap(editor, binding);
    return;
  }

  const onEvent = (info: TLEventInfo) => {
    if (info.type !== "pointer" || info.name !== "pointer_up") return;
    editor.off("event", onEvent);
    // Let the arrow tool finish its own pointer_up handling first.
    setTimeout(() => {
      const latest = editor.getBinding(binding.id) as TLArrowBinding | undefined;
      if (latest) snap(editor, latest);
    }, 0);
  };
  editor.on("event", onEvent);
}

function snap(editor: Editor, binding: TLArrowBinding) {
  const target = editor.getShape(binding.toId);
  if (target?.type !== ENTITY_TABLE_TYPE) return;
  const table = target as EntityTableShape;
  const rowCount = table.props.rows.length;

  const index = rowIndexAt(binding.props.normalizedAnchor.y, rowCount);
  if (index === -1) return; // dropped on the header: leave it as a whole-table arrow

  const x = sideFacingOtherEnd(editor, binding, table);
  const y = rowAnchorY(index, rowCount);
  const { normalizedAnchor, isPrecise } = binding.props;
  if (isPrecise && normalizedAnchor.x === x && Math.abs(normalizedAnchor.y - y) < 1e-6) return;

  editor.updateBinding<TLArrowBinding>({
    id: binding.id,
    type: "arrow",
    props: { ...binding.props, normalizedAnchor: { x, y }, isPrecise: true, isExact: false },
  });
}

// 0 for the table's left edge, 1 for its right edge.
function sideFacingOtherEnd(editor: Editor, binding: TLArrowBinding, table: EntityTableShape) {
  const tableBounds = editor.getShapePageBounds(table.id);
  const arrow = editor.getShape(binding.fromId) as TLArrowShape | undefined;
  if (!tableBounds || !arrow) return 1;

  const otherTerminal = binding.props.terminal === "start" ? "end" : "start";
  const otherBinding = getArrowBindings(editor, arrow)[otherTerminal];
  const otherBounds = otherBinding ? editor.getShapePageBounds(otherBinding.toId) : undefined;
  const otherX = otherBounds
    ? otherBounds.center.x
    : editor.getShapePageTransform(arrow).applyToPoint(arrow.props[otherTerminal]).x;

  return otherX < tableBounds.center.x ? 0 : 1;
}
