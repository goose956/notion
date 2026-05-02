import type { DataAdapter, CustomerCriteria } from "./interface.js";

export type AdapterConstructor = new () => DataAdapter<unknown, unknown, CustomerCriteria>;

/**
 * In-memory registry of adapters loaded per niche.
 * The sync engine (v0.2) will call loadNicheAdapters() at startup.
 * In v0.1 this is scaffolded but not invoked.
 */
const registry = new Map<string, DataAdapter<unknown, unknown, CustomerCriteria>>();

/**
 * Register an adapter instance. Called by each adapter module when it loads.
 */
export function registerAdapter(
  adapter: DataAdapter<unknown, unknown, CustomerCriteria>,
): void {
  const key = `${adapter.niche}:${adapter.id}`;
  registry.set(key, adapter);
}

/**
 * Retrieve a registered adapter by niche and id.
 * Throws if not found — callers should ensure adapters are loaded first.
 */
export function getAdapter(
  niche: string,
  id: string,
): DataAdapter<unknown, unknown, CustomerCriteria> {
  const key = `${niche}:${id}`;
  const adapter = registry.get(key);
  if (adapter === undefined) {
    throw new Error(
      `Adapter '${id}' for niche '${niche}' is not registered. ` +
        `Did you forget to import the adapter module?`,
    );
  }
  return adapter;
}

/**
 * List all registered adapters for a given niche.
 */
export function getNicheAdapters(
  niche: string,
): DataAdapter<unknown, unknown, CustomerCriteria>[] {
  return Array.from(registry.values()).filter((a) => a.niche === niche);
}

/**
 * Clear the registry. Useful in tests.
 */
export function clearRegistry(): void {
  registry.clear();
}
