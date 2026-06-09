import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { socket } from '../socket';

interface PlayerProps {
  id: string;
  position: [number, number, number];
  color: string;
  isLocal: boolean;
}

const Player: React.FC<PlayerProps> = ({ id, position, color, isLocal }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current && !isLocal) {
      groupRef.current.position.set(position[0], position[1] + Math.sin(Date.now() / 200) * 0.1, position[2]);
    }
  });

  const skinColor = '#fcd5ce';
  const pantsColor = '#1e3a8a';

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isLocal && e.button === 0) {
      e.stopPropagation();
      socket.emit('attackPlayer', id);
    }
  };

  return (
    <group ref={groupRef} position={position} onPointerDown={handlePointerDown}>
      {/* Head */}
      <mesh position={[0, 1.5, 0]} castShadow name="player_head">
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, 0.875, 0]} castShadow name="player_body">
        <boxGeometry args={[0.5, 0.75, 0.25]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Arms */}
      <mesh position={[-0.35, 0.875, 0]} castShadow>
        <boxGeometry args={[0.2, 0.75, 0.2]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      <mesh position={[0.35, 0.875, 0]} castShadow>
        <boxGeometry args={[0.2, 0.75, 0.2]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.15, 0.375, 0]} castShadow>
        <boxGeometry args={[0.2, 0.75, 0.2]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
      <mesh position={[0.15, 0.375, 0]} castShadow>
        <boxGeometry args={[0.2, 0.75, 0.2]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
    </group>
  );
};

export default Player;
