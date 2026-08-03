import { defineConfig } from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";

export default defineConfig({
	compiler: "satteri",
	plugins: [lastModified()],
});
