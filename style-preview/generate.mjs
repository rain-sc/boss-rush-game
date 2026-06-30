// Throwaway style-validation script: generates 2 preview images via PixelLab.
// Calls the REST endpoint directly to avoid the SDK's strict `usage` validation
// (this account is on a "generations" plan, which the pinned SDK rejects).
// Run:  PIXELLAB_API_KEY=xxxx node generate.mjs   (key from env only)

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const key = process.env.PIXELLAB_API_KEY;
if (!key) {
  console.error("ERROR: missing PIXELLAB_API_KEY env var");
  process.exit(1);
}

const BASE = "https://api.pixellab.ai/v1";
const STYLE = "16-bit pixel art, limited cohesive palette"; // view handled by `view`

const allJobs = [
  {
    name: "player_male_idle",
    body: {
      description: `a young male adventurer hero, short brown hair, blue tunic, holding a short sword, ${STYLE}`,
      image_size: { width: 64, height: 64 },
      view: "high top-down",
      direction: "south",
      no_background: true,
      outline: "single color black outline",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 8.0,
    },
  },
  {
    name: "player_female_idle",
    // Derive from the male base so proportions / scale match the character set.
    initFrom: "player_male_idle",
    init_image_strength: 130,
    body: {
      description: `a young female warrior girl, long flowing ponytail, slim figure, blue tunic with a skirt, holding a short sword, ${STYLE}`,
      negative_description: "male, masculine, beard, short hair, broad shoulders",
      image_size: { width: 64, height: 64 },
      view: "high top-down",
      direction: "south",
      no_background: true,
      outline: "single color black outline",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 9.0,
    },
  },
  {
    name: "home_scene",
    body: {
      description: `a cozy farm home scene: grass, dirt path, tilled soil and a tree, ${STYLE}`,
      image_size: { width: 128, height: 128 },
      view: "high top-down",
      no_background: false,
      outline: "single color black outline",
      shading: "basic shading",
      detail: "medium detail",
      text_guidance_scale: 8.0,
    },
  },
];

// Optional filter: `node generate.mjs <name>` runs only matching jobs (saves quota).
const only = process.argv[2];
const jobs = only ? allJobs.filter((j) => j.name === only) : allJobs;
if (only && jobs.length === 0) {
  console.error(`No job named "${only}". Available: ${allJobs.map((j) => j.name).join(", ")}`);
  process.exit(1);
}

mkdirSync("output", { recursive: true });

for (const job of jobs) {
  console.log(`Generating ${job.name} ...`);
  try {
    const body = { ...job.body };
    if (job.initFrom) {
      const b = readFileSync(`output/${job.initFrom}.png`).toString("base64");
      body.init_image = { type: "base64", base64: b, format: "png" };
      body.init_image_strength = job.init_image_strength ?? 300;
      console.log(`  (using ${job.initFrom} as init_image, strength ${body.init_image_strength})`);
    }
    const resp = await fetch(`${BASE}/generate-image-pixflux`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error(`  ✗ ${job.name} HTTP ${resp.status}: ${text.slice(0, 300)}`);
      process.exitCode = 1;
      continue;
    }
    const data = await resp.json();
    const b64 = data?.image?.base64;
    if (!b64) {
      console.error(`  ✗ ${job.name}: no image in response: ${JSON.stringify(data).slice(0, 300)}`);
      process.exitCode = 1;
      continue;
    }
    writeFileSync(`output/${job.name}.png`, Buffer.from(b64, "base64"));
    console.log(`  ✓ saved output/${job.name}.png  (usage: ${JSON.stringify(data.usage)})`);
  } catch (err) {
    console.error(`  ✗ ${job.name} failed:`, err?.message || err);
    process.exitCode = 1;
  }
}
console.log("Done.");
