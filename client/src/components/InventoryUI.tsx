import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getProceduralTexture } from '../utils/textureGen';

// Massive block dictionary merging Minecraft and Kerala themes
export const INVENTORY_BLOCKS = [
  // Natural Blocks
  { id: 'stone', category: 'Nature', name: 'Stone', color: '#9ca3af' },
  { id: 'cobblestone', category: 'Natural', name: 'Cobblestone', color: '#57534e' },
  { id: 'dirt', category: 'Nature', name: 'Dirt', color: '#78350f' },
  { id: 'grass', category: 'Nature', name: 'Grass Block', color: '#4ade80' },
  { id: 'diamond_ore', category: 'Nature', name: 'Diamond Ore', color: '#67e8f9' },
  { id: 'water', category: 'Nature', name: 'Water', color: '#3b82f6' },
  { id: 'sand', category: 'Natural', name: 'Sand', color: '#fde047' },
  { id: 'gravel', category: 'Natural', name: 'Gravel', color: '#a8a29e' },
  { id: 'snow', category: 'Natural', name: 'Snow', color: '#ffffff' },
  { id: 'ice', category: 'Natural', name: 'Ice', color: '#7dd3fc' },
  { id: 'obsidian', category: 'Natural', name: 'Obsidian', color: '#171717' },
  { id: 'bedrock', category: 'Natural', name: 'Bedrock', color: '#27272a' },
  
  // Woods & Leaves
  { id: 'oak_wood', category: 'Wood', name: 'Oak Wood', color: '#b45309' },
  { id: 'birch_wood', category: 'Wood', name: 'Birch Wood', color: '#fef3c7' },
  { id: 'spruce_wood', category: 'Wood', name: 'Spruce Wood', color: '#78350f' },
  { id: 'cherry_wood', category: 'Wood', name: 'Cherry Wood', color: '#fbcfe8' },
  { id: 'oak_leaves', category: 'Wood', name: 'Oak Leaves', color: '#15803d' },
  { id: 'cherry_leaves', category: 'Wood', name: 'Cherry Leaves', color: '#f9a8d4' },
  { id: 'planks', category: 'Wood', name: 'Oak Planks', color: '#d97706' },
  
  // Ores & Valuable
  { id: 'coal_ore', category: 'Valuable', name: 'Coal Ore', color: '#27272a' },
  { id: 'iron_ore', category: 'Valuable', name: 'Iron Ore', color: '#d6d3d1' },
  { id: 'gold_ore', category: 'Valuable', name: 'Gold Ore', color: '#facc15' },
  { id: 'diamond_ore', category: 'Valuable', name: 'Diamond Ore', color: '#2dd4bf' },
  { id: 'emerald_ore', category: 'Valuable', name: 'Emerald Ore', color: '#10b981' },
  { id: 'redstone_ore', category: 'Valuable', name: 'Redstone Ore', color: '#ef4444' },
  { id: 'lapis_ore', category: 'Valuable', name: 'Lapis Lazuli Ore', color: '#2563eb' },
  
  // Building & Decoration
  { id: 'bricks', category: 'Building', name: 'Bricks', color: '#b91c1c' },
  { id: 'glass', category: 'Building', name: 'Glass', color: '#93c5fd' },
  { id: 'bookshelf', category: 'Building', name: 'Bookshelf', color: '#92400e' },
  { id: 'white_wool', category: 'Building', name: 'White Wool', color: '#fafafa' },
  { id: 'red_wool', category: 'Building', name: 'Red Wool', color: '#dc2626' },
  { id: 'chest', category: 'Building', name: 'Chest', color: '#b45309' },
  
  // Kerala Hybrid
  { id: 'coconut_wood', category: 'Kerala', name: 'Coconut Wood', color: '#451a03' },
  { id: 'rubber_wood', category: 'Kerala', name: 'Rubber Wood', color: '#fef08a' },
  { id: 'laterite', category: 'Kerala', name: 'Chenkallu (Laterite)', color: '#991b1b' },
  { id: 'tv', category: 'Kerala', name: 'Thattukada TV', color: '#1e3a8a' },
  { id: 'computer', category: 'Kerala', name: 'Techie Computer', color: '#0f766e' },

  // Weapons & Food
  { id: 'sword', category: 'Weapons', name: 'Iron Sword', color: '#94a3b8' },
  { id: 'diamond_sword', category: 'Weapons', name: 'Diamond Sword', color: '#06b6d4' },
  { id: 'apple', category: 'Food', name: 'Apple', color: '#dc2626' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (id: string) => void;
  selectedBlockId: string;
  inventory?: Record<string, number>;
  gamemode?: 'survival' | 'creative';
}

const SpinningBlock = ({ block }: { block: any }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta;
      meshRef.current.rotation.y += delta;
    }
  });

  let texType = 'generic';
  if (block.id.includes('stone') || block.id.includes('ore') || block.id.includes('obsidian')) texType = 'stone';
  if (block.id.includes('wood')) texType = 'wood';
  if (block.id.includes('sand')) texType = 'sand';
  if (block.id.includes('grass')) texType = 'grass';
  
  const texture = getProceduralTexture(block.color, texType);

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial map={texture} color="#ffffff" />
    </mesh>
  );
};

export const InventoryUI = ({ isOpen, onClose, onSelectBlock, selectedBlockId, inventory, gamemode = 'creative' }: Props) => {
  if (!isOpen) return null;

  const categories = Array.from(new Set(INVENTORY_BLOCKS.map(b => b.category)));
  const selectedBlockObj = INVENTORY_BLOCKS.find(b => b.id === selectedBlockId) || INVENTORY_BLOCKS[0];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="bg-navy-900 border border-white/10 w-[900px] max-h-[80vh] rounded-2xl shadow-2xl flex overflow-hidden">
        
        {/* Left Side: Categories */}
        <div className="w-2/3 p-6 overflow-y-auto border-r border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Inventory</h2>
          </div>
          {categories.map(category => (
            <div key={category} className="mb-8">
              <h3 className="text-xl font-semibold text-indigo-400 mb-4">{category}</h3>
              <div className="grid grid-cols-4 gap-4">
                {INVENTORY_BLOCKS.filter(b => b.category === category).map(block => (
                  <button
                    key={block.id}
                    onClick={() => onSelectBlock(block.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all
                      ${selectedBlockId === block.id ? 'bg-indigo-600 border-2 border-white' : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'}
                    `}
                  >
                    <div 
                      className="w-10 h-10 rounded shadow-inner" 
                      style={{ backgroundColor: block.color }}
                    ></div>
                    <span className="text-xs text-center text-gray-300 font-medium truncate w-full">
                      {block.name}
                    </span>
                    <span className="text-[10px] bg-black/50 px-2 py-0.5 rounded-full text-white font-bold">
                      {gamemode === 'creative' ? '∞' : (inventory?.[block.id] || 0)}
                    </span>
                  </button>
                ))}
                {category === 'Weapons' && (
                  <div className="col-span-4 mt-2 bg-white/5 border border-cyan-500/30 p-3 rounded flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      <div className="w-8 h-8 bg-cyan-500 rounded shadow-inner"></div>
                      <div>
                        <h4 className="font-bold text-cyan-300">Diamond Sword</h4>
                        <p className="text-xs text-cyan-500">Costs: 1 Iron Sword, 2 Diamond Ore</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => socket.emit('craftItem', 'diamond_sword')}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded text-sm font-bold shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                    >
                      Upgrade
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right Side: 3D Preview */}
        <div className="w-1/3 p-6 flex flex-col items-center relative bg-black/20">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white px-3 py-1 bg-white/10 hover:bg-white/20 rounded transition-all">
            Close (E)
          </button>
          
          <h3 className="text-lg font-bold text-white mt-10 mb-2">3D Preview</h3>
          <p className="text-indigo-300 mb-4">{selectedBlockObj.name}</p>
          
          <div className="w-full h-64 rounded-xl overflow-hidden bg-black/40 border border-white/5">
            <Canvas camera={{ position: [0, 0, 5] }}>
              <ambientLight intensity={0.8} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <SpinningBlock block={selectedBlockObj} />
            </Canvas>
          </div>
          
          {gamemode === 'survival' && selectedBlockObj.id === 'sword' && (
            <div className="mt-4 w-full bg-indigo-900/40 p-3 rounded-lg border border-indigo-500/30 text-center">
              <h4 className="text-sm font-bold text-white mb-2">Crafting Recipe</h4>
              <p className="text-xs text-gray-300 mb-3">Requires: 2 Oak Wood, 1 Stone</p>
              <button 
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded w-full transition-colors"
                onClick={() => {
                  import('../socket').then(({ socket }) => {
                    socket.emit('craftItem', 'sword');
                  });
                }}
              >
                Craft Sword
              </button>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center mt-6">
            Select a block from the left panel to preview it in 3D. Press E to equip and close inventory.
          </p>
        </div>

      </div>
    </div>
  );
};
