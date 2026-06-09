import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getTerrainHeight } from '../utils/terrain';
import NPC_DIALOGUES from '../data/npcDialogues.json';

interface VillagerProps {
  id: string;
  initialPosition: [number, number, number];
  hasActiveQuest?: boolean;
  onAssignQuest?: () => void;
}

export const Villager: React.FC<VillagerProps> = ({ id, initialPosition, hasActiveQuest, onAssignQuest }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [dialogue, setDialogue] = useState<string | null>(null);
  
  // Random wandering state
  const targetPos = useRef(new THREE.Vector3(...initialPosition));
  const currentPos = useRef(new THREE.Vector3(...initialPosition));
  
  // Speech cooldown state
  const lastSpokeTime = useRef(0);
  const isSpeaking = useRef(false);

  const triggerSpeech = (categoryFilter?: string) => {
    // Pick a random dialogue from the dataset
    let pool = NPC_DIALOGUES;
    if (categoryFilter) {
      pool = NPC_DIALOGUES.filter(d => d.category === categoryFilter);
    }
    const randomDialogueObj = pool[Math.floor(Math.random() * pool.length)];
    setDialogue(randomDialogueObj.text);
    
    // Regional Accent Logic based on X position (Biome mapping)
    let pitch = 1.0;
    let rate = 1.0;
    const xPos = currentPos.current.x;
    
    if (xPos < -20) {
      // Kozhikode (Desert)
      pitch = 0.9;
      rate = 0.8;
    } else if (xPos >= -20 && xPos < 0) {
      // Thrissur (Plains)
      pitch = 1.1; 
      rate = 1.0;
    } else if (xPos >= 0 && xPos < 20) {
      // Kochi (Monsoon)
      pitch = 1.2;
      rate = 1.15; 
    } else {
      // Thiruvananthapuram (Snow)
      pitch = 0.8; 
      rate = 0.9;
    }

    // Text-To-Speech Logic
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(randomDialogueObj.text);
      const voices = window.speechSynthesis.getVoices();
      const accent = voices.find(v => v.lang.includes('ml-IN') || v.lang.includes('hi-IN') || v.lang.includes('en-IN'));
      if (accent) {
        utterance.voice = accent;
      }
      utterance.pitch = pitch; 
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
    }
    
    // Clear dialogue after 4 seconds
    setTimeout(() => {
      setDialogue(null);
      isSpeaking.current = false;
    }, 4000);
  };

  useEffect(() => {
    // Change target position every 3-6 seconds
    const moveInterval = setInterval(() => {
      const offsetX = (Math.random() - 0.5) * 10;
      const offsetZ = (Math.random() - 0.5) * 10;
      
      const newX = initialPosition[0] + offsetX;
      const newZ = initialPosition[2] + offsetZ;
      const newY = getTerrainHeight(Math.round(newX), Math.round(newZ)) + 1;
      
      targetPos.current.set(newX, newY, newZ);
    }, 4000 + Math.random() * 2000);

    // Initial load of voices to prevent lag on first speak
    if (window.speechSynthesis) window.speechSynthesis.getVoices();

    return () => {
      clearInterval(moveInterval);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [initialPosition]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Lerp position towards target
      currentPos.current.lerp(targetPos.current, delta * 2);
      groupRef.current.position.copy(currentPos.current);
      
      // Look at target
      groupRef.current.lookAt(targetPos.current.x, currentPos.current.y, targetPos.current.z);
      
      // Bobbing animation while moving
      const dist = currentPos.current.distanceTo(targetPos.current);
      if (dist > 0.1) {
        groupRef.current.position.y += Math.sin(Date.now() / 100) * 0.1;
      }

      // Proximity Speech & Quest Logic
      const distToPlayer = state.camera.position.distanceTo(currentPos.current);
      if (distToPlayer < 5 && !isSpeaking.current && Date.now() - lastSpokeTime.current > 10000) {
        isSpeaking.current = true;
        lastSpokeTime.current = Date.now();
        
        if (!hasActiveQuest && onAssignQuest) {
          triggerSpeech('quest');
          onAssignQuest();
        } else {
          // If already has a quest, say a normal line
          const categories = ['greeting', 'funny', 'friend'];
          const cat = categories[Math.floor(Math.random() * categories.length)];
          triggerSpeech(cat);
        }
      }
    }
  });

  const skinColor = '#8b5a2b';
  const robeColor = '#7c2d12';

  return (
    <group ref={groupRef} position={initialPosition}>
      {/* Speech Bubble */}
      {dialogue && (
        <Html position={[0, 2.5, 0]} center>
          <div className="bg-white text-black px-4 py-2 rounded-xl shadow-xl max-w-[200px] text-center font-bold text-sm border-2 border-gray-300 relative">
            {dialogue}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-b-2 border-r-2 border-gray-300"></div>
          </div>
        </Html>
      )}

      {/* Head Group */}
      <group position={[0, 1.5, 0]}>
        {/* Main Head */}
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        
        {/* Left Eye */}
        <mesh position={[-0.1, 0.05, 0.251]} castShadow>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        
        {/* Right Eye */}
        <mesh position={[0.1, 0.05, 0.251]} castShadow>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshStandardMaterial color="#000000" />
        </mesh>

        {/* Mouth */}
        <mesh position={[0, -0.15, 0.251]} castShadow>
          <boxGeometry args={[0.15, 0.05, 0.02]} />
          <meshStandardMaterial color="#3f1d0b" />
        </mesh>
      </group>
      
      {/* Nose (Villager Style) */}
      <mesh position={[0, 1.4, 0.25]} castShadow>
        <boxGeometry args={[0.15, 0.3, 0.15]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      
      {/* Body Robe */}
      <mesh position={[0, 0.875, 0]} castShadow>
        <boxGeometry args={[0.6, 0.75, 0.3]} />
        <meshStandardMaterial color={robeColor} />
      </mesh>
      
      {/* Folded Arms */}
      <mesh position={[0, 0.8, 0.2]} castShadow rotation={[Math.PI / 4, 0, 0]}>
        <boxGeometry args={[0.7, 0.2, 0.2]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.15, 0.375, 0]} castShadow>
        <boxGeometry args={[0.2, 0.75, 0.2]} />
        <meshStandardMaterial color={robeColor} />
      </mesh>
      <mesh position={[0.15, 0.375, 0]} castShadow>
        <boxGeometry args={[0.2, 0.75, 0.2]} />
        <meshStandardMaterial color={robeColor} />
      </mesh>
    </group>
  );
};
