import * as THREE from 'three';

// Cache generated textures so we don't recreate them every render
const textureCache: Record<string, THREE.CanvasTexture> = {};

/**
 * Generates a procedural 16x16 pixel art texture similar to MCPE
 * @param hexColor The base color in hex (e.g. '#4ade80')
 * @param type 'grass' | 'stone' | 'wood' | 'sand' | 'generic'
 * @returns THREE.CanvasTexture
 */
export const getProceduralTexture = (hexColor: string, type: string = 'generic'): THREE.CanvasTexture => {
  const cacheKey = `${hexColor}-${type}`;
  if (textureCache[cacheKey]) {
    return textureCache[cacheKey];
  }

  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas);
    textureCache[cacheKey] = tex;
    return tex;
  }

  // Parse hex to RGB
  const baseColor = new THREE.Color(hexColor);
  
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      let r = baseColor.r;
      let g = baseColor.g;
      let b = baseColor.b;

      // Apply procedural noise based on type to make it realistic
      let noise = (Math.random() - 0.5) * 0.2; // default generic noise

      if (type === 'stone' || type === 'obsidian') {
        noise = (Math.random() - 0.5) * 0.4; // High contrast noise for rocks
      } else if (type === 'wood') {
        // Vertical lines for bark
        noise = (Math.random() - 0.5) * 0.1 + (x % 4 === 0 ? -0.2 : 0); 
      } else if (type === 'sand') {
        noise = (Math.random() - 0.5) * 0.1; // Very fine noise
      } else if (type === 'grass') {
        noise = (Math.random() - 0.5) * 0.15;
      }

      // Apply noise
      r = Math.min(1, Math.max(0, r + noise));
      g = Math.min(1, Math.max(0, g + noise));
      b = Math.min(1, Math.max(0, b + noise));

      // Draw pixel
      ctx.fillStyle = `rgb(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Create texture and apply pixel-art filtering
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter; // Minecraft pixel look
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  
  textureCache[cacheKey] = texture;
  return texture;
};
