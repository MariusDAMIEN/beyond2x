import { readFile, readdir, rm, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const archive = `release/beyond2x-v${packageJson.version}.zip`;

await rm("release", { recursive: true, force: true });
await execFileAsync("mkdir", ["-p", "release"]);
const entries = await readdir("dist");
for (const entry of entries) {
  const entryStat = await stat(`dist/${entry}`);
  if (!entryStat.isFile() && !entryStat.isDirectory()) throw new Error(`Unsupported package entry: ${entry}`);
}
await execFileAsync("zip", ["-q", "-r", `../${archive}`, "."], { cwd: "dist" });
console.log(`Created ${archive}`);
