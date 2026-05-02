export type {
  DataAdapter,
  CustomerCriteria,
} from "./interface.js";

export { ADAPTER_INTERFACE_VERSION } from "./interface.js";

export {
  registerAdapter,
  getAdapter,
  getNicheAdapters,
  clearRegistry,
} from "./registry.js";

export { RssAdapter } from "./base/rss-adapter.js";
export type { RssItem, RssAdapterCriteria } from "./base/rss-adapter.js";

export { RestAdapter } from "./base/rest-adapter.js";
export type { RestAdapterCriteria } from "./base/rest-adapter.js";

export { RedditAdapter } from "./base/reddit-adapter.js";
export type {
  RedditPost,
  RedditAdapterCriteria,
} from "./base/reddit-adapter.js";
