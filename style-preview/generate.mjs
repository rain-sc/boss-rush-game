// Throwaway style-validation script: generates 2 preview images via PixelLab.
// Calls the REST endpoint directly to avoid the SDK's strict `usage` validation
// (this account is on a "generations" plan, which the pinned SDK rejects).
// Run:  PIXELLAB_API_KEY=xxxx node generate.mjs   (key from env only)

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

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

  // --- Phase 2 batch: replace combat placeholders (written into the frontend) ---
  {
    name: "enemy_slime",
    outPath: "../frontend/public/assets/enemies/slime/idle.png",
    body: {
      description: `a small green slime monster, cute round jelly body, ${STYLE}`,
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
    name: "enemy_goblin",
    outPath: "../frontend/public/assets/enemies/goblin/idle.png",
    body: {
      description: `a small green goblin warrior holding a wooden club, ${STYLE}`,
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
    name: "fireball",
    outPath: "../frontend/public/assets/skills/projectiles/fireball.png",
    body: {
      description: `a round fiery fireball projectile, bright orange and yellow flames, ${STYLE}`,
      image_size: { width: 32, height: 32 },
      no_background: true,
      outline: "single color black outline",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 8.0,
    },
  },

  // --- Phase 3 batch: map-1 bosses (static) + forest ground tile ---
  {
    name: "boss_orc_warlord",
    outPath: "../frontend/public/assets/bosses/orc_warlord/idle.png",
    body: {
      description: `a large armored orc warlord boss wielding a giant axe, menacing, ${STYLE}`,
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
    name: "boss_goblin_chieftain",
    outPath: "../frontend/public/assets/bosses/goblin_chieftain/idle.png",
    body: {
      description: `a large goblin chieftain boss with bone armor and a spiked club, ${STYLE}`,
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
    name: "boss_dire_bear",
    outPath: "../frontend/public/assets/bosses/dire_bear/idle.png",
    body: {
      description: `a huge enraged brown bear boss with battle scars, roaring, ${STYLE}`,
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
    name: "boss_forest_dragon",
    outPath: "../frontend/public/assets/bosses/forest_dragon/idle.png",
    body: {
      description: `a massive ancient forest dragon boss covered in moss and vines, wings spread, ${STYLE}`,
      image_size: { width: 96, height: 96 },
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
    name: "forest_ground",
    outPath: "../frontend/public/assets/tiles/battle/forest_ground.png",
    body: {
      description: `seamless tileable top-down grass ground texture, forest floor with small plants and pebbles, ${STYLE}`,
      image_size: { width: 64, height: 64 },
      view: "high top-down",
      no_background: false,
      outline: "lineless",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 7.0,
    },
  },

  // --- Phase 4 batch: hub facility sprites + life item icons ---
  ...[
    ["hub_tree", "hub/tree.png", "a lush green tree", 48],
    ["hub_rock", "hub/rock.png", "a grey rock boulder with shiny ore veins", 48],
    ["hub_pond", "hub/pond.png", "a small round pond of blue water with a grassy rim", 64],
    ["hub_farm", "hub/farm_plot.png", "a patch of tilled brown farm soil with rows", 48],
    ["hub_portal", "hub/portal.png", "a glowing blue magic portal gateway", 56],
  ].map(([name, path, desc, size]) => ({
    name,
    outPath: `../frontend/public/assets/${path}`,
    body: {
      description: `${desc}, ${STYLE}`,
      image_size: { width: size, height: size },
      view: "high top-down",
      no_background: true,
      outline: "single color black outline",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 8.0,
    },
  })),
  ...[
    ["item_wood", "items/wood.png", "a small stack of cut wood logs"],
    ["item_ore", "items/ore.png", "a chunk of grey ore with blue crystals"],
    ["item_herb", "items/herb.png", "a green medicinal herb leaf"],
    ["item_fish", "items/fish.png", "a single blue fish"],
    ["item_carrot", "items/carrot.png", "an orange carrot with green top"],
  ].map(([name, path, desc]) => ({
    name,
    outPath: `../frontend/public/assets/${path}`,
    body: {
      description: `a game item icon of ${desc}, ${STYLE}`,
      image_size: { width: 32, height: 32 },
      no_background: true,
      outline: "single color black outline",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 8.0,
    },
  })),

  // --- Phase 5 batch: potion + equipment icons + workshop house ---
  ...[
    ["item_potion_small", "items/potion_small.png", "a small red health potion bottle", 32],
    ["equip_iron_sword", "equipment/iron_sword.png", "an iron sword", 32],
    ["equip_leather_armor", "equipment/leather_armor.png", "a brown leather armor chestplate", 32],
  ].map(([name, path, desc, size]) => ({
    name,
    outPath: `../frontend/public/assets/${path}`,
    body: {
      description: `a game item icon of ${desc}, ${STYLE}`,
      image_size: { width: size, height: size },
      no_background: true,
      outline: "single color black outline",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 8.0,
    },
  })),
  {
    name: "hub_house",
    outPath: "../frontend/public/assets/hub/house.png",
    body: {
      description: `a small cozy wooden workshop house with a roof, ${STYLE}`,
      image_size: { width: 64, height: 64 },
      view: "high top-down",
      no_background: true,
      outline: "single color black outline",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 8.0,
    },
  },

  // --- Phase 6 batch: 9-slice UI frames ---
  {
    name: "ui_panel",
    outPath: "../frontend/public/assets/ui/panel.png",
    body: {
      description: `a square UI panel with a thick ornate brown wooden border and a flat dark parchment center, game interface frame, ${STYLE}`,
      image_size: { width: 48, height: 48 },
      no_background: false,
      outline: "single color black outline",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 8.0,
    },
  },
  {
    name: "ui_button",
    outPath: "../frontend/public/assets/ui/button.png",
    body: {
      description: `a square wooden game UI button with a raised bevel and brown border, ${STYLE}`,
      image_size: { width: 48, height: 48 },
      no_background: false,
      outline: "single color black outline",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 8.0,
    },
  },

  // --- Map 2: cave battle tileset ---
  {
    name: "cave_ground",
    outPath: "../frontend/public/assets/tiles/battle/cave.png",
    body: {
      description: `seamless tileable top-down dark cave stone floor with cracks, pebbles and moss, ${STYLE}`,
      image_size: { width: 64, height: 64 },
      view: "high top-down",
      no_background: false,
      outline: "lineless",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 7.0,
    },
  },

  // --- Hub cohesion pass: style-locked to house.png (Stardew-ish farm) ---
  ...[
    ['bf_tree', 'hub/tree.png', 'a single lush round tree with soft green foliage and a brown trunk', 96, 96, true],
    ['bf_rock', 'hub/rock.png', 'a mossy grey boulder with a glowing blue ore crystal', 96, 96, true],
    ['bf_pond', 'hub/pond.png', 'a small round pond of blue water with a stone and grass rim', 96, 96, true],
    ['bf_farm', 'hub/farm_plot.png', 'a small square fenced garden plot of tilled brown soil with green sprouts', 96, 96, true],
    ['bf_portal', 'hub/portal.png', 'a glowing blue magic portal with an ornate stone arch', 96, 96, true],
  ].map(([name, path, desc, w, h, noBg]) => ({
    name,
    bitforge: true,
    styleFrom: '../frontend/public/assets/hub/house.png',
    styleStrength: 55,
    outPath: `../frontend/public/assets/${path}`,
    body: {
      description: `${desc}, warm bright cozy farm game, ${STYLE}`,
      image_size: { width: w, height: h },
      view: 'high top-down',
      no_background: noBg,
      outline: 'single color black outline',
      shading: 'basic shading',
      detail: 'medium detail',
      text_guidance_scale: 7.0,
    },
  })),

  // --- Hub redesign: higher detail, larger facilities + grass tile ---
  ...[
    ["hub_tree2", "hub/tree.png", "a large lush oak tree with rich detailed green foliage and a thick gnarled brown trunk", 96],
    ["hub_rock2", "hub/rock.png", "a detailed rocky boulder mining node with glowing blue ore crystals embedded in grey stone", 80],
    ["hub_pond2", "hub/pond.png", "a detailed round pond of clear blue water surrounded by smooth rocks and green reeds", 96],
    ["hub_farm2", "hub/farm_plot.png", "a neat farm plot of tilled brown soil rows with small green crop sprouts and a wooden fence", 80],
    ["hub_house2", "hub/house.png", "a cozy detailed cottage workshop with a thatched roof, stone chimney, wooden door and windows", 96],
    ["hub_portal2", "hub/portal.png", "a glowing magical portal with an ornate carved stone arch and swirling blue energy", 80],
  ].map(([name, path, desc, size]) => ({
    name,
    outPath: `../frontend/public/assets/${path}`,
    body: {
      description: `${desc}, ${STYLE}`,
      image_size: { width: size, height: size },
      view: "high top-down",
      no_background: true,
      outline: "single color black outline",
      shading: "detailed shading",
      detail: "highly detailed",
      text_guidance_scale: 8.0,
    },
  })),
  {
    name: "hub_scene",
    outPath: "../frontend/public/assets/tiles/home/scene.png",
    body: {
      description: `top-down grassy farm yard ground, clean soft green lawn with one faint light dirt path and a few small flowers, open and tidy, not cluttered, no buildings, no water, warm bright cozy farm game, ${STYLE}`,
      image_size: { width: 240, height: 135 },
      view: "high top-down",
      no_background: false,
      outline: "lineless",
      shading: "basic shading",
      detail: "medium detail",
      text_guidance_scale: 7.0,
    },
  },
  {
    name: "hub_farm3",
    outPath: "../frontend/public/assets/hub/farm_plot.png",
    body: {
      description: `a single small square garden plot, a patch of brown tilled soil with a low wooden fence around it and two green sprouts, one object centered, ${STYLE}`,
      image_size: { width: 80, height: 80 },
      view: "high top-down",
      no_background: true,
      negative_description: "grid, many tiles, repeated pattern, multiple plots",
      outline: "single color black outline",
      shading: "basic shading",
      detail: "medium detail",
      text_guidance_scale: 8.0,
    },
  },
  {
    name: "hub_grass",
    outPath: "../frontend/public/assets/tiles/home/grass.png",
    body: {
      description: `a seamless repeating top-down grass lawn texture, even short green grass with subtle blades, fully tileable, no border, no central object, ${STYLE}`,
      image_size: { width: 64, height: 64 },
      view: "high top-down",
      no_background: false,
      outline: "lineless",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 7.0,
    },
  },

  // --- Animated hub facilities: idle bases (64) ---
  ...[
    ['tree', 'a lush green leafy tree'],
    ['rock', 'a grey boulder with glowing blue ore crystals'],
    ['pond', 'a small round pond of blue water with a stone rim'],
    ['farm', 'a small fenced garden plot with tilled soil and green sprouts'],
    ['house', 'a cozy log cabin workshop with a stone chimney'],
    ['portal', 'a glowing blue magic portal with an ornate stone arch'],
  ].map(([id, desc]) => ({
    name: `fac_${id}_idle`,
    outPath: `../frontend/public/assets/hub/${id}/idle.png`,
    body: {
      description: `${desc}, warm bright cozy farm game, ${STYLE}`,
      image_size: { width: 64, height: 64 },
      view: 'high top-down',
      no_background: true,
      outline: 'single color black outline',
      shading: 'basic shading',
      detail: 'medium detail',
      text_guidance_scale: 8.0,
    },
  })),

  // --- Animated hub facilities: animations (animate-with-text, ref = idle) ---
  ...[
    ['tree', 'sway', 'a lush green leafy tree', 'the leaves swaying gently in the wind'],
    ['pond', 'ripple', 'a small round pond of blue water', 'the water rippling gently'],
    ['portal', 'swirl', 'a glowing blue magic portal', 'the magic energy swirling and glowing'],
    ['house', 'smoke', 'a cozy log cabin workshop with a chimney', 'smoke gently rising from the chimney'],
  ].map(([id, anim, desc, action]) => ({
    name: `fac_${id}_${anim}`,
    animate: true,
    reference: `../frontend/public/assets/hub/${id}/idle.png`,
    outDir: `../frontend/public/assets/hub/${id}`,
    anim,
    action,
    nFrames: 4,
    body: {
      description: `${desc}, ${STYLE}`,
      image_size: { width: 64, height: 64 },
      view: 'high top-down',
    },
  })),

  // --- Step 4: remaining minor assets ---
  {
    name: "home_ground",
    outPath: "../frontend/public/assets/tiles/home/ground.png",
    body: {
      description: `seamless tileable top-down farm ground texture, dirt and short grass with small flowers, ${STYLE}`,
      image_size: { width: 64, height: 64 },
      view: "high top-down",
      no_background: false,
      outline: "lineless",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 7.0,
    },
  },
  {
    name: "card_frame",
    outPath: "../frontend/public/assets/ui/card_frame.png",
    body: {
      description: `an ornate vertical fantasy skill card frame border with a parchment center, ${STYLE}`,
      image_size: { width: 48, height: 48 },
      no_background: false,
      outline: "single color black outline",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 8.0,
    },
  },

  // --- Phase 7 batch: skill projectile/effect sprites (6) ---
  ...[
    ["ice_shard", "a sharp ice shard projectile, light blue crystal"],
    ["chain_lightning", "a crackling yellow lightning bolt spark"],
    ["wind_blade", "a green crescent wind blade slash"],
    ["rock_fall", "a falling brown boulder rock"],
    ["poison_cloud", "a swirling green poison gas cloud"],
    ["spin_slash", "a white circular sword slash arc effect"],
  ].map(([id, desc]) => ({
    name: `skill_proj_${id}`,
    outPath: `../frontend/public/assets/skills/projectiles/${id}.png`,
    body: {
      description: `${desc}, ${STYLE}`,
      image_size: { width: 32, height: 32 },
      no_background: true,
      outline: "single color black outline",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 8.0,
    },
  })),

  // --- Phase 7 batch: 12 skill card icons (48x48) ---
  ...[
    ["fireball", "a fireball"],
    ["ice_shard", "an ice shard"],
    ["chain_lightning", "a lightning bolt"],
    ["wind_blade", "a green wind blade"],
    ["rock_fall", "a falling boulder"],
    ["poison_cloud", "a poison gas cloud"],
    ["spin_slash", "a spinning sword slash"],
    ["crit_mastery", "a red crosshair target / critical hit mark"],
    ["lifesteal", "a red blood drop with a small heart"],
    ["haste", "winged boots"],
    ["flame_aura", "a burning flame shield aura"],
    ["fortify", "a sturdy iron shield"],
  ].map(([id, desc]) => ({
    name: `skill_icon_${id}`,
    outPath: `../frontend/public/assets/skills/icons/${id}.png`,
    body: {
      description: `a game skill icon of ${desc}, ${STYLE}`,
      image_size: { width: 48, height: 48 },
      no_background: true,
      outline: "single color black outline",
      shading: "basic shading",
      detail: "low detail",
      text_guidance_scale: 8.0,
    },
  })),

  // --- Animations (animate-with-text): walk / move cycles (1 generation each) ---
  ...[
    ["player_male_walk", "characters/player/male", "walk", "walking", 64,
      "a young male adventurer hero, short brown hair, blue tunic, holding a short sword"],
    ["player_female_walk", "characters/player/female", "walk", "walking", 64,
      "a young female warrior girl, long ponytail, blue tunic with a skirt, holding a short sword"],
    ["enemy_slime_move", "enemies/slime", "move", "hopping", 64, "a small green slime monster, round jelly body"],
    ["enemy_goblin_move", "enemies/goblin", "move", "walking", 64, "a small green goblin warrior holding a wooden club"],
    ["boss_orc_move", "bosses/orc_warlord", "move", "walking", 64, "a large armored orc warlord wielding a giant axe"],
    ["boss_gobchief_move", "bosses/goblin_chieftain", "move", "walking", 64, "a large goblin chieftain with bone armor and a spiked club"],
    ["boss_bear_move", "bosses/dire_bear", "move", "walking", 64, "a huge enraged brown bear with battle scars"],
    ["boss_dragon_move", "bosses/forest_dragon", "move", "moving", 64, "a massive ancient forest dragon covered in moss and vines, wings spread"],
  ].map(([name, dir, anim, action, size, desc]) => ({
    name,
    animate: true,
    reference: `../frontend/public/assets/${dir}/idle.png`,
    outDir: `../frontend/public/assets/${dir}`,
    anim,
    action,
    nFrames: 4,
    body: {
      description: `${desc}, ${STYLE}`,
      image_size: { width: size, height: size },
      view: "high top-down",
      direction: "south",
    },
  })),
];

// Optional filter: `node generate.mjs name1 name2 ...` runs only those jobs.
const names = process.argv.slice(2);
const jobs = names.length ? allJobs.filter((j) => names.includes(j.name)) : allJobs;
if (names.length && jobs.length === 0) {
  console.error(`No matching jobs. Available: ${allJobs.map((j) => j.name).join(", ")}`);
  process.exit(1);
}

mkdirSync("output", { recursive: true });

for (const job of jobs) {
  console.log(`Generating ${job.name} ...`);
  try {
    if (job.animate) {
      const ref = readFileSync(job.reference).toString("base64");
      const abody = {
        ...job.body,
        action: job.action,
        n_frames: job.nFrames,
        reference_image: { type: "base64", base64: ref, format: "png" },
      };
      const aresp = await fetch(`${BASE}/animate-with-text`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(abody),
      });
      if (!aresp.ok) {
        console.error(`  ✗ ${job.name} HTTP ${aresp.status}: ${(await aresp.text()).slice(0, 300)}`);
        process.exitCode = 1;
        continue;
      }
      const adata = await aresp.json();
      const imgs = adata?.images ?? [];
      mkdirSync(job.outDir, { recursive: true });
      imgs.forEach((im, idx) =>
        writeFileSync(`${job.outDir}/${job.anim}_${idx}.png`, Buffer.from(im.base64, "base64")),
      );
      console.log(`  ✓ ${job.name}: ${imgs.length} frames -> ${job.outDir}/${job.anim}_*.png  (usage ${JSON.stringify(adata.usage)})`);
      continue;
    }

    if (job.bitforge) {
      const style = readFileSync(job.styleFrom).toString("base64");
      const bbody = {
        ...job.body,
        style_image: { type: "base64", base64: style, format: "png" },
        style_strength: job.styleStrength ?? 50,
      };
      const bresp = await fetch(`${BASE}/generate-image-bitforge`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(bbody),
      });
      if (!bresp.ok) {
        console.error(`  ✗ ${job.name} HTTP ${bresp.status}: ${(await bresp.text()).slice(0, 300)}`);
        process.exitCode = 1;
        continue;
      }
      const bdata = await bresp.json();
      const bb64 = bdata?.image?.base64;
      if (!bb64) {
        console.error(`  ✗ ${job.name}: no image`);
        process.exitCode = 1;
        continue;
      }
      mkdirSync(dirname(job.outPath), { recursive: true });
      writeFileSync(job.outPath, Buffer.from(bb64, "base64"));
      console.log(`  ✓ ${job.name} (bitforge) -> ${job.outPath}  (usage ${JSON.stringify(bdata.usage)})`);
      continue;
    }

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
    const target = job.outPath ?? `output/${job.name}.png`;
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(b64, "base64"));
    console.log(`  ✓ saved ${target}  (usage: ${JSON.stringify(data.usage)})`);
  } catch (err) {
    console.error(`  ✗ ${job.name} failed:`, err?.message || err);
    process.exitCode = 1;
  }
}
console.log("Done.");
