import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

function FloatingDocument() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef1 = useRef<THREE.Mesh>(null);
  const glowRef2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(t * 0.5) * 0.2;
      meshRef.current.rotation.x = Math.cos(t * 0.3) * 0.1;
    }
    if (glowRef1.current) {
      glowRef1.current.position.y = 2 + Math.sin(t * 2) * 0.2;
    }
    if (glowRef2.current) {
      glowRef2.current.position.y = -2 + Math.cos(t * 2) * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <boxGeometry args={[3, 4, 0.1]} />
        <meshPhysicalMaterial 
          color="#ffffff"
          metalness={0.1}
          roughness={0.2}
          transmission={0.9}
          thickness={0.5}
          ior={1.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
        
        {/* Floating abstract glowing spheres around the document */}
        <mesh ref={glowRef1} position={[-1.5, 2, 0.5]}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshBasicMaterial color="#818CF8" />
        </mesh>
        <mesh ref={glowRef2} position={[1.5, -2, -0.5]}>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshBasicMaterial color="#C084FC" />
        </mesh>
      </mesh>
    </Float>
  );
}

export function Hero3D() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden h-[80vh]">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4F46E5" />
        <FloatingDocument />
        <Environment preset="city" />
        <ContactShadows position={[0, -3, 0]} opacity={0.4} scale={10} blur={2} far={4} color="#6366F1" />
      </Canvas>
    </div>
  );
}
