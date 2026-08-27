export interface ToolNameInput {
  originalName: string;
  serverName: string;
  description?: string;
}

export interface NamespacedToolName {
  exposedName: string;
  originalName: string;
  serverName: string;
  description?: string;
}

/**
 * Keep [A-Za-z0-9_], collapse other runs to `_`, then trim edge underscores.
 * Empty results become `server` so a prefix is always present.
 */
export function sanitizeToolNameSegment(value: string): string {
  const sanitized = value
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return sanitized.length > 0 ? sanitized : "server";
}

function prefixToolDescription(
  description: string | undefined,
  serverName: string,
): string {
  const prefix = `[${serverName}]`;
  if (!description) {
    return prefix;
  }
  if (description.startsWith(prefix)) {
    return description;
  }
  return `${prefix} ${description}`;
}

function uniquifyExposedName(candidate: string, used: Set<string>): string {
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }

  let suffix = 2;
  let uniqueName = `${candidate}_${suffix}`;
  while (used.has(uniqueName)) {
    suffix += 1;
    uniqueName = `${candidate}_${suffix}`;
  }
  used.add(uniqueName);
  return uniqueName;
}

/**
 * Collision-only tool namespacing for aggregated MCP tools/list.
 *
 * Unique original names stay unchanged. When the same original name appears
 * more than once, every copy becomes `${sanitize(serverName)}__${originalName}`.
 * Residual exposed-name collisions get a numeric suffix `_2`, `_3`, ...
 * Renamed tools get `[serverName]` prepended to description.
 */
export function namespaceCollidingTools(
  tools: readonly ToolNameInput[],
): NamespacedToolName[] {
  const originalCounts = new Map<string, number>();
  for (const tool of tools) {
    originalCounts.set(
      tool.originalName,
      (originalCounts.get(tool.originalName) ?? 0) + 1,
    );
  }

  const used = new Set<string>();
  return tools.map((tool) => {
    const colliding = (originalCounts.get(tool.originalName) ?? 0) > 1;
    const candidate = colliding
      ? `${sanitizeToolNameSegment(tool.serverName)}__${tool.originalName}`
      : tool.originalName;
    const exposedName = uniquifyExposedName(candidate, used);
    const renamed = exposedName !== tool.originalName;

    return {
      exposedName,
      originalName: tool.originalName,
      serverName: tool.serverName,
      description: renamed
        ? prefixToolDescription(tool.description, tool.serverName)
        : tool.description,
    };
  });
}
