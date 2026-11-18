// Keep the whole node (including its label) inside the SVG viewport.
export function constrainGraphNode(node, bounds, width, height, padding = 12) {
    if (width <= 0 || height <= 0) return;

    const clampAxis = (position, start, size, viewportSize) => {
        const min = padding - start;
        const max = viewportSize - padding - start - size;
        // If a label is wider than the viewport, keep it centered.
        return min <= max
            ? Math.max(min, Math.min(max, position))
            : (viewportSize - size) / 2 - start;
    };

    const x = clampAxis(node.x, bounds.x, bounds.width, width);
    const y = clampAxis(node.y, bounds.y, bounds.height, height);
    if (x !== node.x) node.vx = 0;
    if (y !== node.y) node.vy = 0;
    node.x = x;
    node.y = y;
    if (node.fx != null) node.fx = x;
    if (node.fy != null) node.fy = y;
}
