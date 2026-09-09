import { cp, mkdir, rename } from "node:fs/promises";

await mkdir("dist/icons", { recursive: true });
await cp("manifest.json", "dist/manifest.json");
await cp("public/icons", "dist/icons", { recursive: true });
await rename("dist/assets/index.css", "dist/assets/player.css");
