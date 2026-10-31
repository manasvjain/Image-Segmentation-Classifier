// Shared by the server (lib/segment.js) and the browser, so it must stay free of Node-only imports.
export const CLASSES = {
  buildings: { label: "Buildings", color: [255, 77, 94] },
  roads: { label: "Roads", color: [255, 205, 60] },
  water: { label: "Water", color: [56, 140, 255] },
};

export const CLASS_LIST = Object.entries(CLASSES).map(([id, c]) => ({ id, ...c, css: `rgb(${c.color.join(",")})` }));

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/tiff"];
