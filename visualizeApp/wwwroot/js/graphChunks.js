// Membership is independent of D3's mutable node positions and link endpoints.
export class GraphChunks {
    constructor(data) {
        this.nodes = data.nodes;
        this.links = data.links.map(link => ({
            ...link,
            source: endpointId(link.source),
            target: endpointId(link.target)
        }));
        this.chunks = [];
        this.nextId = 1;
    }

    create(name, ids) {
        const members = [...new Set(ids)];
        const occupied = new Set(this.chunks.flatMap(chunk => chunk.memberNodeIds));
        if (!name.trim() || members.length < 2 || members.some(id =>
            occupied.has(id) || !this.nodes.some(node => node.id === id))) {
            return null;
        }
        let id;
        do { id = `chunk-${this.nextId++}`; }
        while (this.nodes.some(node => node.id === id));
        const nodes = this.nodes.filter(node => members.includes(node.id));
        const positioned = nodes.filter(node => Number.isFinite(node.x) && Number.isFinite(node.y));
        const chunk = {
            id, label: name.trim(), isChunk: true, collapsed: true,
            memberNodeIds: members,
            x: positioned.length ? positioned.reduce((sum, node) => sum + node.x, 0) / positioned.length : 50,
            y: positioned.length ? positioned.reduce((sum, node) => sum + node.y, 0) / positioned.length : 30
        };
        this.chunks.push(chunk);
        return chunk;
    }

    project() {
        const owners = new Map();
        for (const chunk of this.chunks.filter(chunk => chunk.collapsed)) {
            for (const id of chunk.memberNodeIds) owners.set(id, chunk);
        }
        const nodes = this.nodes.filter(node => !owners.has(node.id))
            .concat(this.chunks.filter(chunk => chunk.collapsed));
        const links = [];
        const aggregated = new Set();
        for (const original of this.links) {
            const sourceOwner = owners.get(original.source);
            const targetOwner = owners.get(original.target);
            if (sourceOwner && sourceOwner === targetOwner) continue;
            const source = sourceOwner?.id ?? original.source;
            const target = targetOwner?.id ?? original.target;
            // Preserve ordinary edges, including self calls. Only chunk edges aggregate.
            const key = JSON.stringify([source, target]);
            if ((sourceOwner || targetOwner) && aggregated.has(key)) continue;
            links.push({ source, target });
            if (sourceOwner || targetOwner) aggregated.add(key);
        }
        return { nodes, links };
    }

    expand(chunk) {
        if (!chunk.collapsed) return;
        const members = this.nodes.filter(node => chunk.memberNodeIds.includes(node.id));
        members.forEach((node, index) => {
            const angle = 2 * Math.PI * index / members.length;
            node.x = node.fx = chunk.x + Math.cos(angle) * 100;
            node.y = node.fy = chunk.y + Math.sin(angle) * 100;
            node.vx = node.vy = 0;
        });
        chunk.collapsed = false;
    }

    collapse(chunk) {
        if (chunk.collapsed) return;
        const members = this.nodes.filter(node => chunk.memberNodeIds.includes(node.id));
        chunk.x = chunk.fx = members.reduce((sum, node) => sum + node.x, 0) / members.length;
        chunk.y = chunk.fy = members.reduce((sum, node) => sum + node.y, 0) / members.length;
        chunk.collapsed = true;
    }

    remove(chunk) {
        this.expand(chunk);
        this.chunks = this.chunks.filter(item => item !== chunk);
    }
}

function endpointId(endpoint) {
    return typeof endpoint === "object" ? endpoint.id : endpoint;
}
