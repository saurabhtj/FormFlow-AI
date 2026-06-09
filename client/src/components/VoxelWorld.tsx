import React, { useState, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { socket } from '../socket';
import { getTerrainHeight, getTerrainBlockType, generateStructures } from '../utils/terrain';
import { getProceduralTexture } from '../utils/textureGen';
import { INVENTORY_BLOCKS } from './InventoryUI';
import type { Quest } from '../types';

interface VoxelWorldProps {
  gamemode: 'survival' | 'creative';
  selectedBlockId: string;
  activeQuest: Quest | null;
  setActiveQuest: (q: Quest | null) => void;
  onQuestComplete: () => void;
  onOpenChest?: (chestKey: string) => void;
}

export const VoxelWorld: React.FC<VoxelWorldProps> = ({ gamemode, selectedBlockId, activeQuest, setActiveQuest, onQuestComplete, onOpenChest }) => {
  const [blocks, setBlocks] = useState<Record<string, string>>({});
  
  useEffect(() => {
    socket.on('worldBlocks', (initialBlocks) => {
      setBlocks(initialBlocks);
    });

    socket.on('blockPlaced', ({ key, color }) => {
      setBlocks(prev => ({ ...prev, [key]: color }));
    });

    socket.on('blockDestroyed', (key) => {
      setBlocks(prev => {
        const newBlocks = { ...prev };
        delete newBlocks[key];
        return newBlocks;
      });
    });

    return () => {
      socket.off('worldBlocks');
      socket.off('blockPlaced');
      socket.off('blockDestroyed');
    };
  }, []);

  const getBlockTexture = (type: string) => {
    const block = INVENTORY_BLOCKS.find(b => b.id === type);
    const color = block ? block.color : '#ffffff';
    
    let texType = 'generic';
    if (type.includes('stone') || type.includes('ore') || type.includes('obsidian')) texType = 'stone';
    if (type.includes('wood')) texType = 'wood';
    if (type.includes('sand')) texType = 'sand';
    if (type.includes('grass')) texType = 'grass';
    
    return getProceduralTexture(color, texType);
  };

  // Procedural Terrain Generation
  const terrainBlocks = useMemo(() => {
    const tBlocks: Record<string, string> = {};
    const size = 20; // 40x40 grid centered at 0,0
    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        const height = getTerrainHeight(x, z);
        // Fill from y=0 to height
        for (let y = 0; y <= height; y++) {
           const type = getTerrainBlockType(x, y, z);
           tBlocks[`${x},${y},${z}`] = type;
        }
      }
    }
    
    // Merge structures
    const structures = generateStructures(size);
    for (const [key, type] of Object.entries(structures)) {
      tBlocks[key] = type;
    }
    
    return tBlocks;
  }, []);

  // Merge server blocks over procedural terrain (server blocks can overwrite or destroy)
  // If a server block value is 'destroyed' (or just not in the merge if we handle destruction),
  // Wait, our server just deletes keys for destroyed blocks. But if it was a procedural block,
  // deleting it from the server state won't hide it from procedural state.
  // We need to track 'destroyed' procedural blocks.
  // We can change the server so `destroyBlock` sets the block to 'AIR'.
  // For now, let's just let the client track local destroyed procedural blocks.
  const [destroyedProcedural, setDestroyedProcedural] = useState<Set<string>>(new Set());

  // Handle destruction
  useEffect(() => {
    socket.on('blockDestroyed', (key: string) => {
      setBlocks(prev => {
        const newBlocks = { ...prev };
        delete newBlocks[key];
        return newBlocks;
      });
      setDestroyedProcedural(prev => new Set(prev).add(key));
    });
    return () => { socket.off('blockDestroyed'); };
  }, []);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    // Only handle if clicked on the mesh itself, not UI
    e.stopPropagation();

    if (e.object.name !== 'voxel' && e.object.name !== 'terrain') return;
    
    // Middle click is generally used for picking blocks, left for destroying, right for placing
    // We'll use: Left (0) = Destroy, Right (2) = Place

    if (e.button === 2) {
      // Right click: Place Block
      if (selectedBlockId === 'sword') return; // Cannot place sword

      const intersection = e.intersections[0];
      if (intersection && intersection.face) {
        // Check if we right-clicked an existing chest
        const targetPos = intersection.object.position;
        const targetKey = `${targetPos.x},${targetPos.y},${targetPos.z}`;
        
        if (blocks[targetKey] === 'chest' && onOpenChest) {
          onOpenChest(targetKey);
          return;
        }

        // Otherwise, place block: Find position slightly outside the face
        const normal = intersection.face.normal.clone();
        const pos = intersection.point.clone().add(normal.multiplyScalar(0.5));
        
        const x = Math.floor(pos.x);
        const y = Math.floor(pos.y);
        const z = Math.floor(pos.z);
        
        const key = `${x},${y},${z}`;
        
        // Prevent placing inside existing block
        if (!blocks[key]) {
          const color = selectedBlockId; // We map ID to color/texture down the line, or store ID directly
          socket.emit('placeBlock', { position: [x, y, z], color });
          
          // Quest Progress Tracking
          if (activeQuest && activeQuest.type === 'place' && activeQuest.blockId === selectedBlockId && setActiveQuest && onQuestComplete) {
            const newCount = activeQuest.currentCount + 1;
            if (newCount >= activeQuest.targetCount) {
              onQuestComplete();
            } else {
              setActiveQuest({ ...activeQuest, currentCount: newCount });
            }
          }
        }
      }
    } else if (e.button === 0) {
      // Left click: Destroy Block
      if (selectedBlockId === 'sword') return; // Sword is for attacking, not mining

      const intersection = e.intersections[0];
      if (intersection) {
        // We can just use the object position instead of raycasting into the face, 
        // since each block is a separate mesh now!
        const pos = intersection.object.position;
        const key = `${pos.x},${pos.y},${pos.z}`;
        
        let destroyedBlockId = '';

        if (blocks[key]) {
          destroyedBlockId = blocks[key];
          socket.emit('destroyBlock', { key, blockId: destroyedBlockId });
        } else if (terrainBlocks[key]) {
          destroyedBlockId = terrainBlocks[key];
          setDestroyedProcedural(prev => new Set(prev).add(key));
          socket.emit('destroyBlock', { key, blockId: destroyedBlockId });
        }
        
        // Quest Progress Tracking
        if (destroyedBlockId && activeQuest && activeQuest.type === 'destroy' && activeQuest.blockId === destroyedBlockId && setActiveQuest && onQuestComplete) {
          const newCount = activeQuest.currentCount + 1;
          if (newCount >= activeQuest.targetCount) {
            onQuestComplete();
          } else {
            setActiveQuest({ ...activeQuest, currentCount: newCount });
          }
        }
      }
    }
  };

  // Combine terrain + user blocks
  const renderBlocks = { ...terrainBlocks };
  destroyedProcedural.forEach(key => { delete renderBlocks[key]; });
  Object.assign(renderBlocks, blocks);

  return (
    <group>
      {/* Ground Plane (Bedrock layer) */}
      <mesh 
        receiveShadow 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.5, 0]} 
        onPointerDown={handlePointerDown}
        name="ground"
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#171717" /> {/* Obsidian/Bedrock color */}
      </mesh>

      {/* Render All Blocks */}
      {Object.entries(renderBlocks).map(([key, type]) => {
        const [x, y, z] = key.split(',').map(Number);
        return (
          <mesh 
            key={key} 
            position={[x, y, z]} 
            castShadow 
            receiveShadow
            onPointerDown={handlePointerDown}
            name="terrain"
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial map={getBlockTexture(type)} color="#ffffff" />
          </mesh>
        );
      })}
    </group>
  );
};
