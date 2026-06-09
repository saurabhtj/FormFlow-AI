import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import worldData from '../data/worldData.json';
import { Sky } from '@react-three/drei';

export const WeatherSystem = ({ globalWeatherOverride, timeOfDay = 12 }: { globalWeatherOverride?: 'clear' | 'rain' | 'snow' | null, timeOfDay?: number }) => {
  const { camera, scene } = useThree();
  const [currentBiome, setCurrentBiome] = useState(worldData[0]);
  const particlesRef = useRef<THREE.Points>(null);
  
  // Calculate sun position based on timeOfDay (0 to 24)
  // 6 AM = sunrise, 12 PM = noon, 6 PM = sunset
  const timeAngle = ((timeOfDay - 6) / 24) * Math.PI * 2;
  const sunX = Math.cos(timeAngle) * 100;
  const sunY = Math.sin(timeAngle) * 100;
  const sunZ = Math.sin(timeAngle) * 50; // Slight tilt
  
  const isNight = timeOfDay < 6 || timeOfDay > 18;
  const sunIntensity = Math.max(0, Math.sin(timeAngle)) * 1.5;
  const ambientIntensity = isNight ? 0.1 : 0.5;

  // Generate particle buffer for weather (rain/snow)
  const particleCount = 2000;
  const particles = useMemo(() => {
    const p = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      p[i * 3] = (Math.random() - 0.5) * 40;     // x
      p[i * 3 + 1] = Math.random() * 40;         // y
      p[i * 3 + 2] = (Math.random() - 0.5) * 40; // z
    }
    return p;
  }, [particleCount]);

  useFrame((state, delta) => {
    const x = camera.position.x;
    
    // Find Biome based on X position
    const biome = { ...(worldData.find(b => x >= b.Region_Bounds.minX && x < b.Region_Bounds.maxX) || worldData[0]) };
    
    // OVERRIDE logic
    if (globalWeatherOverride) {
      if (globalWeatherOverride === 'clear') biome.Weather = 'Clear';
      if (globalWeatherOverride === 'rain') biome.Weather = 'Rain';
      if (globalWeatherOverride === 'snow') biome.Weather = 'Snow';
    }
    
    if (biome.Weather !== currentBiome.Weather || biome.Biome_ID !== currentBiome.Biome_ID) {
      setCurrentBiome(biome);
      
      // Update fog based on biome
      if (biome.Weather === 'Rain') {
        scene.fog = new THREE.FogExp2('#475569', 0.05); // Grey fog for monsoon
      } else if (biome.Weather === 'Snow') {
        scene.fog = new THREE.FogExp2('#e2e8f0', 0.06); // White fog for snow
      } else if (biome.Weather === 'Sunny') {
        scene.fog = new THREE.FogExp2('#fef08a', 0.02); // Light yellow fog for desert
      } else {
        scene.fog = new THREE.FogExp2(isNight ? '#0f172a' : '#bae6fd', 0.02);
      }
    }

    // Dynamic Fog color for day/night transitions in normal weather
    if (biome.Weather !== 'Rain' && biome.Weather !== 'Snow' && biome.Weather !== 'Sunny') {
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(new THREE.Color(isNight ? '#0f172a' : '#bae6fd'), 0.05);
      }
    }

    // Animate weather particles if Rain or Snow
    if (particlesRef.current && (currentBiome.Weather === 'Rain' || currentBiome.Weather === 'Snow')) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const speed = currentBiome.Weather === 'Rain' ? 15 : 5;
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] -= speed * delta; // Fall down
        
        // Reset if hitting ground
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 40;
          positions[i * 3] = camera.position.x + (Math.random() - 0.5) * 40; // Keep around player
          positions[i * 3 + 2] = camera.position.z + (Math.random() - 0.5) * 40;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      {sunIntensity > 0 && (
        <directionalLight 
          castShadow 
          position={[sunX, sunY, sunZ]} 
          intensity={sunIntensity} 
          shadow-mapSize={[1024, 1024]}
        />
      )}

      {/* Sky Colors based on Time & Biome */}
      {currentBiome.Weather === 'Rain' ? (
        <Sky sunPosition={[sunX, sunY, sunZ]} turbidity={10} rayleigh={5} />
      ) : currentBiome.Weather === 'Snow' ? (
        <Sky sunPosition={[sunX, sunY, sunZ]} turbidity={2} rayleigh={2} />
      ) : currentBiome.Weather === 'Sunny' ? (
        <Sky sunPosition={[sunX, sunY, sunZ]} turbidity={0.5} rayleigh={0.5} mieCoefficient={0.005} />
      ) : (
        <Sky sunPosition={[sunX, sunY, sunZ]} />
      )}

      {/* Weather Particles */}
      {(currentBiome.Weather === 'Rain' || currentBiome.Weather === 'Snow') && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={particleCount}
              array={particles}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={currentBiome.Weather === 'Rain' ? 0.2 : 0.4}
            color={currentBiome.Weather === 'Rain' ? '#93c5fd' : '#ffffff'}
            transparent
            opacity={0.6}
            sizeAttenuation
          />
        </points>
      )}
    </>
  );
};
