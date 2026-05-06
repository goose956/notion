// Registers all real-estate-investor adapters by importing their modules.
// Each module calls registerAdapter() as a side-effect on load.
import "./sources/zillow-rss.js";
import "./sources/redfin-rss.js";
import "./sources/global-rss.js";
import "./sources/propstream.js";
