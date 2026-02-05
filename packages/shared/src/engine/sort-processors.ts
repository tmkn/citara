import type { Processor } from "../processors/processor.js";

export function sortProcessors(processors: readonly Processor[]): Processor[] {
    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const processorMap = new Map<string, Processor>();

    // Initialize graph nodes and detect duplicate names
    for (const p of processors) {
        if (processorMap.has(p.name)) {
            throw new Error(
                `Duplicate processor name detected: '${p.name}'. Processor names must be unique within a session.`,
            );
        }

        processorMap.set(p.name, p);
        adjList.set(p.name, []);
        inDegree.set(p.name, 0);
    }

    // Build graph edges based on dependencies
    for (const p of processors) {
        const deps = p.dependsOn ?? [];

        for (const dep of deps) {
            if (!processorMap.has(dep)) {
                throw new Error(
                    `Missing dependency: Processor '${p.name}' depends on '${dep}', which is not registered in the session.`,
                );
            }

            adjList.get(dep)!.push(p.name);
            inDegree.set(p.name, inDegree.get(p.name)! + 1);
        }
    }

    // Kahn's Algorithm for Topological Sort
    const queue: string[] = [];

    for (const [name, degree] of inDegree.entries()) {
        if (degree === 0) queue.push(name);
    }

    const sorted: Processor[] = [];

    while (queue.length > 0) {
        const current = queue.shift()!;
        sorted.push(processorMap.get(current)!);

        for (const neighbor of adjList.get(current)!) {
            inDegree.set(neighbor, inDegree.get(neighbor)! - 1);

            if (inDegree.get(neighbor) === 0) {
                queue.push(neighbor);
            }
        }
    }

    // If we couldn't process all nodes, there is a cycle
    if (sorted.length !== processors.length) {
        throw new Error("Circular dependency detected in processor configuration.");
    }

    return sorted;
}
