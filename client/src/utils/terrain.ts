import { createNoise2D } from 'simplex-noise';

// Create a deterministic noise generator so all players see the same world
// In a real game, you would seed this.
const noise2D = createNoise2D();

export const getTerrainHeight = (x: number, z: number): number => {
  // Scale down x,z to make hills wider
  const scale = 0.05;
  const rawNoise = noise2D(x * scale, z * scale);
  
  // Map noise from [-1, 1] to a height range, e.g. [0, 10]
  const height = Math.floor((rawNoise + 1) * 5); 
  
  return height; // Returns an integer height
};

export const getTerrainBlockType = (x: number, y: number, z: number): string => {
  // Simple logic to determine block type based on height
  if (y <= 1) return 'sand'; // Water level / beach
  if (y > 7) return 'snow'; // Mountain tops
  if (y > 5) return 'stone'; // Mountains
  return 'grass'; // Default plains/hills
};

// Procedural Structure Generation
export const generateStructures = (size: number): Record<string, string> => {
  const structureBlocks: Record<string, string> = {};
  
  // Try to place a few "Ruined Shrines" randomly
  // We use a simple hash instead of full noise for structure placement to keep it sparse
  for (let sx = -size + 5; sx < size - 5; sx += 15) {
    for (let sz = -size + 5; sz < size - 5; sz += 15) {
      // 10% chance to spawn a shrine in this sector
      if (Math.abs(noise2D(sx, sz)) > 0.8) {
        const baseY = getTerrainHeight(sx, sz) + 1;
        
        // Shrine blueprint
        const blueprint = [
          // Base
          { dx: -2, dy: 0, dz: -2, t: 'stone' }, { dx: -1, dy: 0, dz: -2, t: 'stone' }, { dx: 0, dy: 0, dz: -2, t: 'stone' }, { dx: 1, dy: 0, dz: -2, t: 'stone' }, { dx: 2, dy: 0, dz: -2, t: 'stone' },
          { dx: -2, dy: 0, dz: -1, t: 'stone' }, { dx: -1, dy: 0, dz: -1, t: 'stone' }, { dx: 0, dy: 0, dz: -1, t: 'stone' }, { dx: 1, dy: 0, dz: -1, t: 'stone' }, { dx: 2, dy: 0, dz: -1, t: 'stone' },
          { dx: -2, dy: 0, dz:  0, t: 'stone' }, { dx: -1, dy: 0, dz:  0, t: 'stone' }, { dx: 0, dy: 0, dz:  0, t: 'obsidian' }, { dx: 1, dy: 0, dz:  0, t: 'stone' }, { dx: 2, dy: 0, dz:  0, t: 'stone' },
          { dx: -2, dy: 0, dz:  1, t: 'stone' }, { dx: -1, dy: 0, dz:  1, t: 'stone' }, { dx: 0, dy: 0, dz:  1, t: 'stone' }, { dx: 1, dy: 0, dz:  1, t: 'stone' }, { dx: 2, dy: 0, dz:  1, t: 'stone' },
          { dx: -2, dy: 0, dz:  2, t: 'stone' }, { dx: -1, dy: 0, dz:  2, t: 'stone' }, { dx: 0, dy: 0, dz:  2, t: 'stone' }, { dx: 1, dy: 0, dz:  2, t: 'stone' }, { dx: 2, dy: 0, dz:  2, t: 'stone' },
          
          // Pillars
          { dx: -2, dy: 1, dz: -2, t: 'stone' }, { dx: -2, dy: 2, dz: -2, t: 'stone' }, { dx: -2, dy: 3, dz: -2, t: 'stone' },
          { dx:  2, dy: 1, dz: -2, t: 'stone' }, { dx:  2, dy: 2, dz: -2, t: 'stone' }, { dx:  2, dy: 3, dz: -2, t: 'stone' },
          { dx: -2, dy: 1, dz:  2, t: 'stone' }, { dx: -2, dy: 2, dz:  2, t: 'stone' }, { dx: -2, dy: 3, dz:  2, t: 'stone' },
          { dx:  2, dy: 1, dz:  2, t: 'stone' }, { dx:  2, dy: 2, dz:  2, t: 'stone' }, { dx:  2, dy: 3, dz:  2, t: 'stone' },
          
          // Roof rim
          { dx: -2, dy: 4, dz: -2, t: 'obsidian' }, { dx: -1, dy: 4, dz: -2, t: 'obsidian' }, { dx: 0, dy: 4, dz: -2, t: 'obsidian' }, { dx: 1, dy: 4, dz: -2, t: 'obsidian' }, { dx: 2, dy: 4, dz: -2, t: 'obsidian' },
          { dx: -2, dy: 4, dz: -1, t: 'obsidian' }, { dx: 2, dy: 4, dz: -1, t: 'obsidian' },
          { dx: -2, dy: 4, dz: 0, t: 'obsidian' },  { dx: 2, dy: 4, dz: 0, t: 'obsidian' },
          { dx: -2, dy: 4, dz: 1, t: 'obsidian' },  { dx: 2, dy: 4, dz: 1, t: 'obsidian' },
          { dx: -2, dy: 4, dz: 2, t: 'obsidian' }, { dx: -1, dy: 4, dz: 2, t: 'obsidian' }, { dx: 0, dy: 4, dz: 2, t: 'obsidian' }, { dx: 1, dy: 4, dz: 2, t: 'obsidian' }, { dx: 2, dy: 4, dz: 2, t: 'obsidian' },
        ];
        
        blueprint.forEach(block => {
          structureBlocks[`${sx + block.dx},${baseY + block.dy},${sz + block.dz}`] = block.t;
        });
      }
    }
  }
  
  return structureBlocks;
};
