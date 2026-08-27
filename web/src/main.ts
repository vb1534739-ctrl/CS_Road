import "./style.css";

import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  MeshBuilder,
  PBRMaterial,
  Scene,
  ShadowGenerator,
  TransformNode,
  Vector3
} from "@babylonjs/core";

type CharacterName = "frog" | "cat";
type LaneType = "grass" | "road" | "water";

interface MovingObject {
  id: string;
  mesh: TransformNode;
  lane: number;
  speed: number;
  width: number;
}

const canvas = document.querySelector<HTMLCanvasElement>("#renderCanvas")!;
const isMobile = matchMedia("(pointer: coarse)").matches || innerWidth < 900;

const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: true,
  powerPreference: "high-performance"
}, true);

engine.setHardwareScalingLevel(
  Math.max(1, (window.devicePixelRatio || 1) / (isMobile ? 1.25 : 1.7))
);

const scene = new Scene(engine);
scene.clearColor = new Color4(0.55, 0.82, 1, 1);
scene.skipPointerMovePicking = true;

const camera = new ArcRotateCamera(
  "camera",
  Math.PI / 4,
  Math.PI / 3.15,
  isMobile ? 13.5 : 14.5,
  new Vector3(0, 0, 4),
  scene
);
camera.inputs.clear();
camera.fov = isMobile ? 0.8 : 0.68;

const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
hemi.intensity = 1.05;

const sun = new DirectionalLight("sun", new Vector3(-0.6, -1, 0.55), scene);
sun.position = new Vector3(8, 14, -10);
sun.intensity = 1.8;

const shadow = new ShadowGenerator(isMobile ? 1024 : 2048, sun);
shadow.useBlurExponentialShadowMap = true;
shadow.blurKernel = isMobile ? 10 : 22;
shadow.darkness = 0.28;

function material(name: string, hex: string, roughness = 0.85) {
  const m = new PBRMaterial(name, scene);
  m.albedoColor = Color3.FromHexString(hex);
  m.roughness = roughness;
  m.metallic = 0;
  return m;
}

const mats = {
  grass1: material("grass1", "#78C95C"),
  grass2: material("grass2", "#87D968"),
  road: material("road", "#454B52"),
  line: material("line", "#ECECEC"),
  water: material("water", "#36A9DF", 0.3),
  log: material("log", "#8B5428"),
  logLight: material("logLight", "#B87538"),
  trunk: material("trunk", "#7C4A25"),
  leaf: material("leaf", "#55AF45"),
  red: material("red", "#F46F56"),
  yellow: material("yellow", "#F3C84F"),
  glass: material("glass", "#BDE7F7", 0.2),
  tire: material("tire", "#20262B"),
  frog: material("frog", "#63B948"),
  frogLight: material("frogLight", "#82D45E"),
  orange: material("orange", "#EE9840"),
  cream: material("cream", "#F6C578"),
  white: material("white", "#FFFFFF"),
  black: material("black", "#222222")
};

function makeBox(name: string, w: number, h: number, d: number, m: PBRMaterial) {
  const mesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
  mesh.material = m;
  mesh.receiveShadows = true;
  shadow.addShadowCaster(mesh);
  return mesh;
}

function makeSphere(name: string, diameter: number, m: PBRMaterial) {
  const mesh = MeshBuilder.CreateSphere(name, {
    diameter,
    segments: isMobile ? 8 : 12
  }, scene);
  mesh.material = m;
  shadow.addShadowCaster(mesh);
  return mesh;
}

function seeded(n: number) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function laneType(y: number): LaneType {
  if (y <= 1) return "grass";
  const r = seeded(y);
  if (r < 0.43) return "road";
  if (r < 0.7) return "water";
  return "grass";
}

function direction(y: number) {
  return y % 2 === 0 ? 1 : -1;
}

function speed(y: number) {
  return (1.35 + (y % 5) * 0.14) * direction(y);
}

const laneRoots = new Map<number, TransformNode>();
const cars: MovingObject[] = [];
const logs: MovingObject[] = [];

function tree(parent: TransformNode, x: number, z: number) {
  const root = new TransformNode("tree", scene);
  root.parent = parent;
  root.position.set(x, 0, z);

  const trunk = makeBox("trunk", 0.28, 0.7, 0.28, mats.trunk);
  trunk.parent = root;
  trunk.position.y = 0.35;

  const crown = makeBox("crown", 0.85, 0.78, 0.85, mats.leaf);
  crown.parent = root;
  crown.position.y = 0.98;
}

function createLane(y: number) {
  if (laneRoots.has(y)) return;

  const root = new TransformNode(`lane-${y}`, scene);
  const type = laneType(y);

  const ground = makeBox(
    `ground-${y}`,
    9,
    0.18,
    1,
    type === "grass"
      ? y % 2 ? mats.grass1 : mats.grass2
      : type === "road" ? mats.road : mats.water
  );
  ground.parent = root;
  ground.position.set(0, -0.09, y);

  if (type === "road") {
    for (let x = -4; x <= 4; x += 1.15) {
      const dash = makeBox("dash", 0.58, 0.025, 0.055, mats.line);
      dash.parent = root;
      dash.position.set(x, 0.015, y);
    }

    const count = 1 + (y % 2);
    for (let i = 0; i < count; i++) {
      const carRoot = new TransformNode(`car-${y}-${i}`, scene);
      carRoot.parent = root;

      const body = makeBox("body", 1.25, 0.48, 0.62, (y + i) % 2 ? mats.red : mats.yellow);
      body.parent = carRoot;
      body.position.y = 0.34;

      const cabin = makeBox("cabin", 0.58, 0.34, 0.5, mats.glass);
      cabin.parent = carRoot;
      cabin.position.set(-0.12 * direction(y), 0.72, 0);

      for (const ox of [-0.4, 0.4]) {
        for (const oz of [-0.33, 0.33]) {
          const tire = makeBox("tire", 0.18, 0.22, 0.12, mats.tire);
          tire.parent = carRoot;
          tire.position.set(ox, 0.14, oz);
        }
      }

      carRoot.position.set(-5.4 + i * 5.2 + seeded(y * 8 + i) * 2, 0, y);
      cars.push({
        id: `${y}-${i}`,
        mesh: carRoot,
        lane: y,
        speed: speed(y) * 1.35,
        width: 1.25
      });
    }
  }

  if (type === "water") {
    const count = 2 + (y % 2);
    for (let i = 0; i < count; i++) {
      const logRoot = new TransformNode(`log-${y}-${i}`, scene);
      logRoot.parent = root;

      const body = makeBox("log", 2.6, 0.34, 0.52, mats.log);
      body.parent = logRoot;
      body.position.y = 0.2;

      for (let x = -0.8; x <= 0.8; x += 0.65) {
        const stripe = makeBox("stripe", 0.06, 0.025, 0.54, mats.logLight);
        stripe.parent = logRoot;
        stripe.position.set(x, 0.385, 0);
      }

      logRoot.position.set(-5.6 + i * 4.2 + seeded(y * 5 + i) * 1.2, 0, y);
      logs.push({
        id: `${y}-${i}`,
        mesh: logRoot,
        lane: y,
        speed: speed(y) * 0.62,
        width: 2.6
      });
    }
  }

  if (type === "grass") {
    const r = seeded(y * 7.3);
    if (r > 0.5) tree(root, -3.4 + seeded(y * 2.2) * 0.7, y);
    if (r > 0.76) tree(root, 3.2 - seeded(y * 5.1) * 0.7, y);
  }

  laneRoots.set(y, root);
}

for (let y = 0; y < 20; y++) createLane(y);

let characterName: CharacterName =
  (localStorage.getItem("crossyCharacter") as CharacterName) || "frog";
let characterRoot = new TransformNode("character", scene);

function rebuildCharacter(name: CharacterName) {
  characterRoot.getChildMeshes().forEach((m) => m.dispose());

  if (name === "frog") {
    const body = makeSphere("frogBody", 0.58, mats.frog);
    body.parent = characterRoot;
    body.scaling.set(1, 1.25, 0.9);
    body.position.y = 0.55;

    const head = makeSphere("frogHead", 0.64, mats.frogLight);
    head.parent = characterRoot;
    head.scaling.set(1, 0.8, 0.9);
    head.position.y = 1.05;

    for (const x of [-0.19, 0.19]) {
      const eye = makeSphere("eye", 0.2, mats.white);
      eye.parent = characterRoot;
      eye.position.set(x, 1.3, -0.19);

      const pupil = makeSphere("pupil", 0.075, mats.black);
      pupil.parent = characterRoot;
      pupil.position.set(x, 1.32, -0.27);
    }
  } else {
    const body = makeSphere("catBody", 0.58, mats.orange);
    body.parent = characterRoot;
    body.scaling.set(0.95, 1.3, 0.88);
    body.position.y = 0.55;

    const head = makeSphere("catHead", 0.62, mats.orange);
    head.parent = characterRoot;
    head.scaling.set(1, 0.86, 0.92);
    head.position.y = 1.05;

    for (const x of [-0.2, 0.2]) {
      const ear = makeBox("ear", 0.18, 0.3, 0.16, mats.orange);
      ear.parent = characterRoot;
      ear.position.set(x, 1.37, 0);
      ear.rotation.z = x < 0 ? 0.18 : -0.18;

      const eye = makeSphere("catEye", 0.07, mats.black);
      eye.parent = characterRoot;
      eye.position.set(x * 0.7, 1.1, -0.29);
    }

    const muzzle = makeSphere("muzzle", 0.28, mats.cream);
    muzzle.parent = characterRoot;
    muzzle.scaling.set(1.2, 0.75, 0.65);
    muzzle.position.set(0, 0.98, -0.28);
  }
}

rebuildCharacter(characterName);

let player = { x: 0, y: 0 };
let from = { x: 0, y: 0 };
let target = { x: 0, y: 0 };
let jump = 1;
let score = 0;
let best = Number(localStorage.getItem("crossyBest") || 0);
let dead = false;
let riding: MovingObject | null = null;

const scoreEl = document.querySelector("#score")!;
const bestEl = document.querySelector("#best")!;
const gameOverEl = document.querySelector<HTMLElement>("#gameOver")!;
const finalScoreEl = document.querySelector("#finalScore")!;

function hud() {
  scoreEl.textContent = `🏆 ${score}`;
  bestEl.textContent = `Рекорд: ${Math.max(score, best)}`;
}

function reset() {
  player = { x: 0, y: 0 };
  from = { x: 0, y: 0 };
  target = { x: 0, y: 0 };
  jump = 1;
  score = 0;
  dead = false;
  riding = null;
  characterRoot.position.set(0, 0, 0);
  camera.target.set(0, 0, 4);
  gameOverEl.style.display = "none";
  hud();
}

function die() {
  if (dead) return;
  dead = true;
  riding = null;
  best = Math.max(best, score);
  localStorage.setItem("crossyBest", String(best));
  finalScoreEl.textContent = `Счёт: ${score}`;
  gameOverEl.style.display = "flex";
  hud();
}

function move(dx: number, dy: number) {
  if (dead || jump < 1) return;

  riding = null;
  from = { ...player };
  target = {
    x: Math.max(-3.5, Math.min(3.5, player.x + dx)),
    y: Math.max(0, player.y + dy)
  };
  jump = 0;
}

function land() {
  player = { ...target };
  score = Math.max(score, Math.round(player.y));

  if (laneType(Math.round(player.y)) === "water") {
    const hit = logs.find(
      (l) =>
        l.lane === Math.round(player.y) &&
        Math.abs(player.x - l.mesh.position.x) < l.width * 0.47
    );

    if (!hit) {
      die();
      return;
    }

    riding = hit;
  }

  hud();
}

function updateObjects(dt: number) {
  for (const item of [...cars, ...logs]) {
    item.mesh.position.x += item.speed * dt;

    if (item.speed > 0 && item.mesh.position.x > 5.6) {
      item.mesh.position.x = -5.6;
    }
    if (item.speed < 0 && item.mesh.position.x < -5.6) {
      item.mesh.position.x = 5.6;
    }
  }
}

function updatePlayer(dt: number) {
  if (dead) return;

  if (jump < 1) {
    jump = Math.min(1, jump + dt * 5.8);
    const q = 1 - Math.pow(1 - jump, 3);

    player.x = from.x + (target.x - from.x) * q;
    player.y = from.y + (target.y - from.y) * q;

    characterRoot.position.set(
      player.x,
      Math.sin(jump * Math.PI) * 0.48,
      player.y
    );

    if (jump === 1) {
      characterRoot.position.y = 0;
      land();
    }
  } else if (riding) {
    player.x = riding.mesh.position.x;
    characterRoot.position.x = player.x;

    if (Math.abs(player.x) > 4.25) die();
  }

  if (jump === 1 && laneType(Math.round(player.y)) === "road") {
    for (const car of cars) {
      if (
        car.lane === Math.round(player.y) &&
        Math.abs(player.x - car.mesh.position.x) < car.width * 0.55
      ) {
        die();
        break;
      }
    }
  }
}

function ensureWorld() {
  for (let y = 0; y <= Math.round(player.y) + 18; y++) {
    createLane(y);
  }
}

function updateCamera(dt: number) {
  const desired = new Vector3(0, 0.15, player.y + 4.1);
  camera.target = Vector3.Lerp(camera.target, desired, Math.min(1, dt * 5));
}

let last = performance.now();
scene.onBeforeRenderObservable.add(() => {
  const now = performance.now();
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  updateObjects(dt);
  updatePlayer(dt);
  ensureWorld();
  updateCamera(dt);
});

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();

  if (e.key === "ArrowUp" || e.key === " " || e.key.toLowerCase() === "w") move(0, 1);
  if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") move(0, -1);
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") move(-1, 0);
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") move(1, 0);
}, { passive: false });

document.querySelectorAll<HTMLButtonElement>("[data-move]").forEach((button) => {
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const d = button.dataset.move;
    if (d === "forward") move(0, 1);
    if (d === "back") move(0, -1);
    if (d === "left") move(-1, 0);
    if (d === "right") move(1, 0);
  });
});

let pointer = { x: 0, y: 0 };

canvas.addEventListener("pointerdown", (e) => {
  pointer = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("pointerup", (e) => {
  const dx = e.clientX - pointer.x;
  const dy = e.clientY - pointer.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 24) return move(0, 1);

  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0);
  else move(0, dy < 0 ? 1 : -1);
});

document.querySelector("#restart")!.addEventListener("click", reset);
document.querySelector("#playAgain")!.addEventListener("click", reset);

document.querySelectorAll<HTMLButtonElement>("[data-character]").forEach((button) => {
  button.addEventListener("click", () => {
    characterName = button.dataset.character as CharacterName;
    localStorage.setItem("crossyCharacter", characterName);
    document.querySelectorAll("[data-character]").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    rebuildCharacter(characterName);
  });
});

document.querySelector(`[data-character="${characterName}"]`)?.classList.add("active");
hud();
