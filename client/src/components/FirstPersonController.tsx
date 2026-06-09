import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { socket } from '../socket';
import { getTerrainHeight } from '../utils/terrain';

export const FirstPersonController = ({ isFPP, isUIOpen, gamemode = 'survival' }: { isFPP: boolean, isUIOpen: boolean, gamemode?: 'survival' | 'creative' }) => {
  const { camera } = useThree();
  const keys = useRef({ w: false, a: false, s: false, d: false, space: false, shift: false });
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const playerPosition = useRef(new THREE.Vector3(0, 10, 5));
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isUIOpen) return; // Disable movement when any UI is open
      
      if (keys.current.hasOwnProperty(e.key.toLowerCase())) {
        keys.current[e.key.toLowerCase() as keyof typeof keys.current] = true;
      }
      if (e.code === 'Space') keys.current.space = true;
      if (e.key === 'Shift') keys.current.shift = true;
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (keys.current.hasOwnProperty(e.key.toLowerCase())) {
        keys.current[e.key.toLowerCase() as keyof typeof keys.current] = false;
      }
      if (e.code === 'Space') keys.current.space = false;
      if (e.key === 'Shift') keys.current.shift = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isUIOpen]);

  useFrame((state, delta) => {
    // If UI open, kill velocity fast
    if (isUIOpen) {
      velocity.current.x -= velocity.current.x * 20.0 * delta;
      velocity.current.z -= velocity.current.z * 20.0 * delta;
      if (gamemode === 'creative') velocity.current.y -= velocity.current.y * 20.0 * delta;
    } else {
      velocity.current.x -= velocity.current.x * 10.0 * delta;
      velocity.current.z -= velocity.current.z * 10.0 * delta;
      if (gamemode === 'creative') velocity.current.y -= velocity.current.y * 10.0 * delta;
    }

    direction.current.z = Number(keys.current.w) - Number(keys.current.s);
    direction.current.x = Number(keys.current.d) - Number(keys.current.a);
    direction.current.normalize(); // consistent diagonal speed

    // X/Z Movement
    if (keys.current.w || keys.current.s) velocity.current.z -= direction.current.z * 40.0 * delta;
    if (keys.current.a || keys.current.d) velocity.current.x -= direction.current.x * 40.0 * delta;

    // Apply movement relative to camera rotation
    const right = new THREE.Vector3().crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3())).normalize();
    const forward = new THREE.Vector3().crossVectors(right, camera.up).normalize();

    playerPosition.current.x += (forward.x * velocity.current.z + right.x * velocity.current.x) * delta;
    playerPosition.current.z += (forward.z * velocity.current.z + right.z * velocity.current.x) * delta;

    const terrainY = getTerrainHeight(Math.round(playerPosition.current.x), Math.round(playerPosition.current.z));
    const eyeLevel = terrainY + 2; // Head is 2 blocks above ground

    // Gamemode Logic
    if (gamemode === 'survival') {
      // Jumping / Gravity
      if (keys.current.space && playerPosition.current.y <= eyeLevel + 0.1) {
        velocity.current.y = 10;
      }
      velocity.current.y -= 9.8 * 2.0 * delta; // Gravity
      playerPosition.current.y += velocity.current.y * delta;
      
      if (playerPosition.current.y < eyeLevel) {
        velocity.current.y = 0;
        playerPosition.current.y = eyeLevel; // Floor collision
      }
    } else {
      // Creative Mode Flying
      if (keys.current.space) velocity.current.y += 20.0 * delta;
      if (keys.current.shift) velocity.current.y -= 20.0 * delta;
      playerPosition.current.y += velocity.current.y * delta;
      
      // Stop flying through ground
      if (playerPosition.current.y < eyeLevel) {
        velocity.current.y = 0;
        playerPosition.current.y = eyeLevel;
      }
    }

    // Emit position to server
    if (Math.abs(velocity.current.x) > 0.1 || Math.abs(velocity.current.z) > 0.1 || Math.abs(velocity.current.y) > 0.1) {
       // Send the capsule center (y-1) so it renders correctly for other players
       socket.emit('playerMovement', {
         position: [playerPosition.current.x, playerPosition.current.y - 1, playerPosition.current.z],
         rotation: [0, camera.rotation.y, 0]
       });
    }

    // Apply camera position based on perspective
    if (isFPP) {
       camera.position.copy(playerPosition.current);
    } else {
       // Third Person: Camera is pulled back 5 units and up 2 units, looking at player
       const offset = new THREE.Vector3(0, 2, 5);
       
       // Note: third-person camera rotation logic is simplified for now
       camera.position.copy(playerPosition.current).add(offset);
       camera.lookAt(playerPosition.current);
    }
  });

  return !isUIOpen ? <PointerLockControls /> : null;
};
