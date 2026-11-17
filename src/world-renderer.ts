export type WorldBuilding = { type: string; level?: number };
export type WorldTile = {
  owner: string | null;
  terrain: "plain" | "forest" | "mountain" | "water";
  buildings?: WorldBuilding[];
};
export type WorldPlayer = { id: string; color: string };
export type WorldFrame = {
  width: number;
  height: number;
  tiles: Array<WorldTile | undefined>;
  players: WorldPlayer[];
  mapName: string;
  mapSeed: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  showGrid: boolean;
};

const VERTEX_SHADER = "#version 300 es\n" +
  "in vec2 aPosition;\n" +
  "in vec2 aUv;\n" +
  "out vec2 vUv;\n" +
  "void main() { vUv = aUv; gl_Position = vec4(aPosition, 0.0, 1.0); }\n";

const FRAGMENT_SHADER = "#version 300 es\n" +
  "precision highp float;\n" +
  "precision highp int;\n" +
  "uniform sampler2D uWorld;\n" +
  "uniform vec2 uMapSize;\n" +
  "uniform vec2 uViewport;\n" +
  "uniform vec2 uCamera;\n" +
  "uniform float uZoom;\n" +
  "uniform float uGrid;\n" +
  "uniform vec4 uPlayerColors[64];\n" +
  "in vec2 vUv;\n" +
  "out vec4 outColor;\n" +
  "float hash21(vec2 p) { p = fract(p * vec2(123.34,345.45)); p += dot(p,p+34.345); return fract(p.x*p.y); }\n" +
  "float noise2(vec2 p) { vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f); float a=hash21(i); float b=hash21(i+vec2(1.0,0.0)); float c=hash21(i+vec2(0.0,1.0)); float d=hash21(i+vec2(1.0,1.0)); return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }\n" +
  "ivec2 safeCell(ivec2 p) { return clamp(p,ivec2(0),ivec2(uMapSize)-ivec2(1)); }\n" +
  "int terrainAtCell(ivec2 p) { return int(floor(texelFetch(uWorld,safeCell(p),0).r*255.0+0.5)); }\n" +
  "int ownerAtCell(ivec2 p) { return int(floor(texelFetch(uWorld,safeCell(p),0).g*255.0+0.5)); }\n" +
  "void main() {\n" +
  " vec2 screenUv=vec2(vUv.x,1.0-vUv.y);\n" +
  " vec2 world=uCamera+(screenUv-0.5)*uViewport/uZoom;\n" +
  " if(world.x<0.0||world.y<0.0||world.x>=uMapSize.x||world.y>=uMapSize.y){outColor=vec4(0.018,0.075,0.12,1.0);return;}\n" +
  " ivec2 cell=ivec2(floor(world)); vec4 packed=texelFetch(uWorld,cell,0);\n" +
  " int terrain=int(floor(packed.r*255.0+0.5)); int owner=int(floor(packed.g*255.0+0.5)); int building=int(floor(packed.b*255.0+0.5));\n" +
  " float broad=noise2(world*0.014); float detail=noise2(world*0.092); float fine=noise2(world*0.31);\n" +
  " float shade=0.86+broad*0.19+detail*0.08+fine*0.025; vec3 color;\n" +
  " if(terrain==0){float swell=0.5+0.5*sin(world.x*0.052+world.y*0.031);color=vec3(0.025,0.13,0.205)+vec3(0.012,0.06,0.075)*swell;color*=0.93+detail*0.13;}\n" +
  " else if(terrain==2){color=vec3(0.075,0.285,0.185)*shade;}\n" +
  " else if(terrain==3){color=vec3(0.37,0.43,0.46)*(0.82+broad*0.28+detail*0.12);}\n" +
  " else {color=vec3(0.29,0.445,0.27)*shade;}\n" +
  " if(owner>0&&terrain!=0){vec3 faction=uPlayerColors[owner].rgb;float tint=terrain==3?0.78:terrain==2?0.84:0.91;color=mix(color,faction*(0.91+broad*0.15),tint);}\n" +
  " vec2 local=fract(world); float coast=0.0;\n" +
  " if(terrain==0){float edge=clamp(1.35/uZoom,0.035,0.15);if(terrainAtCell(cell+ivec2(-1,0))!=0)coast=max(coast,1.0-smoothstep(0.0,edge,local.x));if(terrainAtCell(cell+ivec2(1,0))!=0)coast=max(coast,1.0-smoothstep(0.0,edge,1.0-local.x));if(terrainAtCell(cell+ivec2(0,-1))!=0)coast=max(coast,1.0-smoothstep(0.0,edge,local.y));if(terrainAtCell(cell+ivec2(0,1))!=0)coast=max(coast,1.0-smoothstep(0.0,edge,1.0-local.y));color=mix(color,vec3(0.18,0.43,0.49),coast*0.58);}\n" +
  " float border=0.0;\n" +
  " if(owner>0){float edge=clamp(1.25/uZoom,0.035,0.14);if(ownerAtCell(cell+ivec2(-1,0))!=owner)border=max(border,1.0-smoothstep(0.0,edge,local.x));if(ownerAtCell(cell+ivec2(1,0))!=owner)border=max(border,1.0-smoothstep(0.0,edge,1.0-local.x));if(ownerAtCell(cell+ivec2(0,-1))!=owner)border=max(border,1.0-smoothstep(0.0,edge,local.y));if(ownerAtCell(cell+ivec2(0,1))!=owner)border=max(border,1.0-smoothstep(0.0,edge,1.0-local.y));color=mix(color,color*0.37,border*0.92);}\n" +
  " if(building>0&&owner>0&&uZoom>=5.0){vec2 d=abs(local-0.5);float stamp=1.0-smoothstep(0.115,0.16,max(d.x,d.y));vec3 stampColor=vec3(0.96,0.86,0.60);if(building==2)stampColor=vec3(0.56,0.88,0.98);else if(building==3)stampColor=vec3(0.42,0.91,0.92);else if(building==4)stampColor=vec3(0.98,0.68,0.52);else if(building==5)stampColor=vec3(0.98,0.82,0.45);else if(building==6)stampColor=vec3(0.57,0.91,0.59);color=mix(color,stampColor,stamp*0.94);}\n" +
  " if(uGrid>0.5&&uZoom>5.0&&terrain!=0){float gridEdge=min(min(local.x,1.0-local.x),min(local.y,1.0-local.y));float gridLine=1.0-smoothstep(0.008,0.03,gridEdge);color=mix(color,color*0.76,gridLine*0.42);}\n" +
  " outColor=vec4(color,1.0);\n" +
  "}\n";

function terrainCode(terrain: WorldTile["terrain"]): number {
  if (terrain === "forest") return 2;
  if (terrain === "mountain") return 3;
  if (terrain === "water") return 0;
  return 1;
}

function buildingCode(tile: WorldTile | undefined): number {
  const type = tile?.buildings?.[0]?.type;
  switch (type) {
    case "city": return 1;
    case "factory": return 2;
    case "port": return 3;
    case "defense_post": return 4;
    case "market": return 5;
    case "farm": return 6;
    default: return 0;
  }
}

function colorToRgba(value: string): [number, number, number] {
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hex) {
    const raw = hex[1]!.length === 3 ? hex[1]!.split("").map(v => v + v).join("") : hex[1]!;
    return [parseInt(raw.slice(0, 2), 16) / 255, parseInt(raw.slice(2, 4), 16) / 255, parseInt(raw.slice(4, 6), 16) / 255];
  }
  const hsl = value.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/i);
  if (hsl) {
    const h = (((Number(hsl[1]) % 360) + 360) % 360) / 360;
    const s = Math.max(0, Math.min(1, Number(hsl[2]) / 100));
    const l = Math.max(0, Math.min(1, Number(hsl[3]) / 100));
    const hue = (p: number, q: number, t: number) => {
      let v = t;
      if (v < 0) v += 1;
      if (v > 1) v -= 1;
      if (v < 1 / 6) return p + (q - p) * 6 * v;
      if (v < 1 / 2) return q;
      if (v < 2 / 3) return p + (q - p) * (2 / 3 - v) * 6;
      return p;
    };
    if (s === 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)];
  }
  return [0.35, 0.72, 0.82];
}

export class WorldRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly texture: WebGLTexture;
  private readonly uniforms: {
    mapSize: WebGLUniformLocation;
    viewport: WebGLUniformLocation;
    camera: WebGLUniformLocation;
    zoom: WebGLUniformLocation;
    grid: WebGLUniformLocation;
    colors: WebGLUniformLocation;
  };
  private mapKey = "";
  private worldPixels = new Uint8Array(0);
  private patch = new Uint8Array(0);
  private readonly ownerSlots = new Map<string, number>();
  private nextOwnerSlot = 1;
  private readonly palette = new Float32Array(64 * 4);
  private readonly colorScratch = new Float32Array(64 * 4);

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 is unavailable in this browser.");
    this.gl = gl;

    const compile = (type: number, source: string): WebGLShader => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Could not allocate a WebGL shader.");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || "Unknown shader compile error";
        gl.deleteShader(shader);
        throw new Error(message);
      }
      return shader;
    };

    const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) throw new Error("Could not allocate the WebGL program.");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || "Unknown WebGL link error";
      gl.deleteProgram(program);
      throw new Error(message);
    }
    this.program = program;

    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!vao || !buffer || !texture) throw new Error("Could not allocate WebGL map resources.");
    this.vao = vao;
    this.texture = texture;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1,
    ]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    const uv = gl.getAttribLocation(program, "aUv");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
    gl.bindVertexArray(null);

    const location = (name: string) => {
      const found = gl.getUniformLocation(program, name);
      if (!found) throw new Error("Missing WebGL uniform: " + name);
      return found;
    };
    this.uniforms = {
      mapSize: location("uMapSize"),
      viewport: location("uViewport"),
      camera: location("uCamera"),
      zoom: location("uZoom"),
      grid: location("uGrid"),
      colors: location("uPlayerColors[0]"),
    };

    gl.useProgram(program);
    gl.uniform1i(location("uWorld"), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
  }

  private ensureWorld(
    width: number,
    height: number,
    mapName: string,
    mapSeed: number,
    terrainAt: (x: number, y: number) => WorldTile["terrain"],
  ): void {
    const key = width + ":" + height + ":" + mapName + ":" + mapSeed;
    if (this.mapKey === key) return;
    this.mapKey = key;
    this.ownerSlots.clear();
    this.nextOwnerSlot = 1;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        pixels[offset] = terrainCode(terrainAt(x, y));
        pixels[offset + 1] = 0;
        pixels[offset + 2] = 0;
        pixels[offset + 3] = 255;
      }
    }
    this.worldPixels = pixels;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  }

  private assignPlayerSlots(players: WorldPlayer[]): void {
    this.colorScratch.fill(0);
    for (const player of players) {
      let slot = this.ownerSlots.get(player.id);
      if (slot === undefined && this.nextOwnerSlot < 64) {
        slot = this.nextOwnerSlot++;
        this.ownerSlots.set(player.id, slot);
      }
      if (slot === undefined) continue;
      const [r, g, b] = colorToRgba(player.color);
      const offset = slot * 4;
      this.colorScratch[offset] = r;
      this.colorScratch[offset + 1] = g;
      this.colorScratch[offset + 2] = b;
      this.colorScratch[offset + 3] = 1;
    }
    this.palette.set(this.colorScratch);
  }

  private uploadVisible(frame: WorldFrame, left: number, top: number, right: number, bottom: number): void {
    const patchWidth = right - left + 1;
    const patchHeight = bottom - top + 1;
    const required = patchWidth * patchHeight * 4;
    if (this.patch.length < required) this.patch = new Uint8Array(required);
    let destination = 0;
    for (let y = top; y <= bottom; y++) {
      let index = y * frame.width + left;
      for (let x = left; x <= right; x++, index++) {
        const source = index * 4;
        const tile = frame.tiles[index];
        const owner = tile?.owner ? (this.ownerSlots.get(tile.owner) || 0) : 0;
        this.patch[destination++] = this.worldPixels[source]!;
        this.patch[destination++] = owner;
        this.patch[destination++] = buildingCode(tile);
        this.patch[destination++] = 255;
      }
    }
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, left, top, patchWidth, patchHeight, gl.RGBA, gl.UNSIGNED_BYTE, this.patch.subarray(0, required));
  }

  draw(frame: WorldFrame, terrainAt: (x: number, y: number) => WorldTile["terrain"]): void {
    const gl = this.gl;
    const cssWidth = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const cssHeight = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const bufferWidth = Math.max(1, Math.round(cssWidth * dpr));
    const bufferHeight = Math.max(1, Math.round(cssHeight * dpr));
    if (this.canvas.width !== bufferWidth || this.canvas.height !== bufferHeight) {
      this.canvas.width = bufferWidth;
      this.canvas.height = bufferHeight;
    }

    this.ensureWorld(frame.width, frame.height, frame.mapName, frame.mapSeed, terrainAt);
    this.assignPlayerSlots(frame.players);

    const halfWorldWidth = cssWidth / (2 * frame.zoom);
    const halfWorldHeight = cssHeight / (2 * frame.zoom);
    const left = Math.max(0, Math.min(frame.width - 1, Math.floor(frame.cameraX - halfWorldWidth) - 2));
    const top = Math.max(0, Math.min(frame.height - 1, Math.floor(frame.cameraY - halfWorldHeight) - 2));
    const right = Math.max(left, Math.min(frame.width - 1, Math.ceil(frame.cameraX + halfWorldWidth) + 2));
    const bottom = Math.max(top, Math.min(frame.height - 1, Math.ceil(frame.cameraY + halfWorldHeight) + 2));
    this.uploadVisible(frame, left, top, right, bottom);

    gl.viewport(0, 0, bufferWidth, bufferHeight);
    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.mapSize, frame.width, frame.height);
    gl.uniform2f(this.uniforms.viewport, cssWidth, cssHeight);
    gl.uniform2f(this.uniforms.camera, frame.cameraX, frame.cameraY);
    gl.uniform1f(this.uniforms.zoom, frame.zoom);
    gl.uniform1f(this.uniforms.grid, frame.showGrid ? 1 : 0);
    gl.uniform4fv(this.uniforms.colors, this.palette);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  clear(): void {
    const gl = this.gl;
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const bw = Math.round(width * dpr);
    const bh = Math.round(height * dpr);
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
    gl.viewport(0, 0, bw, bh);
    gl.clearColor(0.018, 0.075, 0.12, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}
