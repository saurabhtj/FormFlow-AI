import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useLocation } from 'react-router-dom';
import { socket } from '../socket';
import Player from '../components/Player';
import { VoxelWorld } from '../components/VoxelWorld';
import { FirstPersonController } from '../components/FirstPersonController';
import { WeatherSystem } from '../components/WeatherSystem';
import { InventoryUI, INVENTORY_BLOCKS } from '../components/InventoryUI';
import { StorageUI } from '../components/StorageUI';
import { Villager } from '../components/Villager';
import type { Quest } from '../types';

interface PlayerState {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
}

const GameScene = () => {
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  const [myId, setMyId] = useState<string | null>(null);
  const [isFPP, setIsFPP] = useState(true);
  
  // Inventory State
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [activeChestKey, setActiveChestKey] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState('grass');
  
  // Gamemode State
  const [gamemode, setGamemode] = useState<'survival' | 'creative'>('survival');
  const [globalWeatherOverride, setGlobalWeatherOverride] = useState<'clear' | 'rain' | 'snow' | null>(null);
  const [timeOfDay, setTimeOfDay] = useState(8); // 0 to 24
  
  // Quest State
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [questNotification, setQuestNotification] = useState<string | null>(null);

  // Combat State
  const [isAttacking, setIsAttacking] = useState(false);

  // Chat State
  const [activeNpcChat, setActiveNpcChat] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{sender: string, text: string}[]>([]);
  
  const location = useLocation();
  const avatarColor = location.state?.avatarColor || '#ffffff';

  useEffect(() => {
    socket.on('connect', () => {
      setMyId(socket.id || null);
      socket.emit('setAvatar', avatarColor);
    });

    socket.on('currentPlayers', (serverPlayers: Record<string, PlayerState>) => {
      setPlayers(serverPlayers);
    });

    socket.on('playerJoined', (newPlayer: PlayerState) => {
      setPlayers(prev => ({ ...prev, [newPlayer.id]: newPlayer }));
    });

    socket.on('playerMoved', (playerData: PlayerState) => {
      setPlayers(prev => {
        if (!prev[playerData.id]) return prev;
        return {
          ...prev,
          [playerData.id]: {
            ...prev[playerData.id],
            position: playerData.position,
            rotation: playerData.rotation
          }
        };
      });
    });

    socket.on('playerLeft', (playerId: string) => {
      setPlayers(prev => {
        const newPlayers = { ...prev };
        delete newPlayers[playerId];
        return newPlayers;
      });
    });

    socket.on('weatherOverride', (weather) => {
      setGlobalWeatherOverride(weather);
    });

    socket.on('timeUpdate', (time) => {
      setTimeOfDay(time);
    });

    return () => {
      socket.off('connect');
      socket.off('currentPlayers');
      socket.off('playerJoined');
      socket.off('playerMoved');
      socket.off('playerLeft');
      socket.off('weatherOverride');
      socket.off('timeUpdate');
    };
  }, [avatarColor]);

  // Sync gamemode to server
  useEffect(() => {
    socket.emit('setGamemode', gamemode);
  }, [gamemode]);

  // Keybindings
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'v' && !isInventoryOpen) {
        setIsFPP(prev => !prev);
      }
      if (e.key.toLowerCase() === 'e') {
        setIsInventoryOpen(prev => {
          if (!prev) {
            document.exitPointerLock(); // Unlock mouse so we can click inventory
          }
          return !prev;
        });
      }
      if (e.key.toLowerCase() === 'g' && !isInventoryOpen) {
        setGamemode(prev => {
          const nextMode = prev === 'survival' ? 'creative' : 'survival';
          socket.emit('setGamemode', nextMode);
          return nextMode;
        });
      }
      if (e.key.toLowerCase() === 'f' && gamemode === 'survival' && !isInventoryOpen) {
        socket.emit('eatFood');
      }
      if (e.key.toLowerCase() === 't' && !isInventoryOpen && !activeNpcChat) {
        // T for Chat - in a real game we'd raycast or check distance.
        // For prototype, just open chat with npc1
        setActiveNpcChat('npc1');
      }
      if (e.key === 'Escape' && activeNpcChat) {
        setActiveNpcChat(null);
      }
      
      // God controls (Weather shortcuts in creative mode)
      if (gamemode === 'creative' && !isInventoryOpen) {
        if (e.key === '1') socket.emit('setGlobalWeather', 'clear');
        if (e.key === '2') socket.emit('setGlobalWeather', 'rain');
        if (e.key === '3') socket.emit('setGlobalWeather', 'snow');
        if (e.key === '4') socket.emit('setGlobalWeather', null);
      }
    };
    window.addEventListener('keydown', handleKey);
    
    // Attack handling
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 0 && !isInventoryOpen && (selectedBlockId === 'sword' || selectedBlockId === 'diamond_sword')) {
        setIsAttacking(true);
        socket.emit('attackSweep', selectedBlockId);
        setTimeout(() => setIsAttacking(false), 200);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isInventoryOpen, gamemode, selectedBlockId]);

  const handleAssignQuest = () => {
    const types: ('place'|'destroy')[] = ['place', 'destroy'];
    const type = types[Math.floor(Math.random() * types.length)];
    const blocks = ['stone', 'dirt', 'grass', 'sand', 'oak_wood', 'glass', 'bricks'];
    const block = blocks[Math.floor(Math.random() * blocks.length)];
    const count = Math.floor(Math.random() * 5) + 3;
    
    setActiveQuest({
      id: Math.random().toString(),
      type,
      blockId: block,
      targetCount: count,
      currentCount: 0,
      description: `${type === 'place' ? 'Place' : 'Destroy'} ${count} ${block.replace('_', ' ')} blocks`
    });
  };

  const handleQuestComplete = () => {
    setActiveQuest(null);
    setQuestNotification("Quest Completed! +50 XP");
    setTimeout(() => setQuestNotification(null), 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeNpcChat || !myId) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { sender: 'You', text: userMessage }]);

    try {
      const res = await fetch('http://localhost:3001/api/npc/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: myId,
          npcId: activeNpcChat,
          action: userMessage
        })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { sender: 'Villager', text: data.dialogue }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { sender: 'System', text: 'Failed to reach AI.' }]);
    }
  };

  // Find the selected block object to display its name/color in UI
  const selectedBlockObj = INVENTORY_BLOCKS.find(b => b.id === selectedBlockId) || INVENTORY_BLOCKS[0];

  return (
    <div className="w-full h-screen relative cursor-crosshair">
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-10 glass px-4 py-2 rounded-xl text-white pointer-events-none">
        <h1 className="font-bold">StoryForge Ultimate</h1>
        <p className="text-sm opacity-80 mt-1 uppercase text-yellow-300 font-bold tracking-wider">{gamemode} MODE</p>
        <p className="text-sm opacity-80 mt-2">W,A,S,D: Move | SPACE: Jump</p>
        {gamemode === 'creative' && <p className="text-sm text-cyan-300">SHIFT: Descend (Flying)</p>}
        <p className="text-sm opacity-80 mt-1">Left Click: Destroy | Right Click: Place</p>
        <p className="text-sm font-bold text-yellow-400 mt-1">Press V: Switch to {isFPP ? '3rd Person' : '1st Person'}</p>
        <p className="text-sm font-bold text-indigo-300 mt-1">Press E: Open Inventory</p>
        <p className="text-sm font-bold text-purple-400 mt-1">Press G: Toggle Gamemode</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs">Equipped:</span>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: selectedBlockObj.color }}></div>
          <span className="text-sm font-bold">{selectedBlockObj.name}</span>
        </div>
        <p className="text-xs text-green-400 mt-2">Players Online: {Object.keys(players).length}</p>
      </div>

      {/* Quest UI */}
      {activeQuest && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-yellow-900/80 border-2 border-yellow-600 px-6 py-3 rounded-xl text-white pointer-events-none">
          <h2 className="font-bold text-yellow-400 uppercase text-sm mb-1">Active Quest</h2>
          <p className="text-lg font-bold">{activeQuest.description}</p>
          <div className="w-full bg-black/50 rounded-full h-2 mt-2 overflow-hidden">
            <div className="bg-yellow-400 h-full transition-all" style={{ width: `${(activeQuest.currentCount / activeQuest.targetCount) * 100}%` }}></div>
          </div>
          <p className="text-xs text-right mt-1">{activeQuest.currentCount} / {activeQuest.targetCount}</p>
        </div>
      )}

      {/* Quest Notification */}
      {questNotification && (
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 text-4xl font-extrabold text-yellow-300 drop-shadow-[0_0_10px_rgba(255,255,0,0.8)] animate-bounce pointer-events-none">
          {questNotification}
        </div>
      )}

      {/* Creative Mode Weather Controls */}
      {gamemode === 'creative' && !isInventoryOpen && (
        <div className="absolute top-4 right-4 z-10 glass px-4 py-3 rounded-xl text-white flex flex-col gap-2 pointer-events-none">
          <h2 className="font-bold text-sm uppercase text-cyan-300">God Controls (Global Weather)</h2>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-yellow-500/80 rounded text-xs font-bold">[1] Clear</span>
            <span className="px-3 py-1 bg-blue-500/80 rounded text-xs font-bold">[2] Rain</span>
            <span className="px-3 py-1 bg-white/80 text-gray-800 rounded text-xs font-bold">[3] Snow</span>
            <span className="px-3 py-1 bg-gray-500/80 rounded text-xs font-bold">[4] Auto</span>
          </div>
          <p className="text-xs opacity-70">Press 1-4 to override weather for ALL players</p>
        </div>
      )}

      {/* Rain Overlay */}
      {globalWeatherOverride === 'rain' && (
        <div className="absolute inset-0 pointer-events-none z-10 opacity-40 bg-[url('https://cdn.pixabay.com/photo/2015/06/25/17/21/rain-821217_1280.jpg')] bg-cover mix-blend-screen animate-pulse"></div>
      )}

      {/* Survival HP/MP/Hunger Bars */}
      {gamemode === 'survival' && myId && players[myId] && !isInventoryOpen && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 w-96 flex flex-col gap-2 pointer-events-none">
          {/* Careers Overlay */}
          {players[myId].careers && Object.keys(players[myId].careers!).length > 0 && (
            <div className="flex justify-center gap-2 mb-2">
              {Object.entries(players[myId].careers!).map(([career, xp]) => {
                const level = Math.floor(xp / 100) + 1;
                const progress = xp % 100;
                return (
                  <div key={career} className="bg-black/60 px-3 py-1 rounded-full border border-indigo-500/50 flex flex-col items-center shadow-lg">
                    <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">{career} LVL {level}</span>
                    <div className="w-16 h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="w-full bg-gray-900/80 rounded-full h-4 border-2 border-gray-700 overflow-hidden relative shadow-lg">
            <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${players[myId].hp || 100}%` }}></div>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">HP: {players[myId].hp || 100}/100</span>
          </div>
          <div className="flex gap-2">
            <div className="w-1/2 bg-gray-900/80 rounded-full h-3 border-2 border-gray-700 overflow-hidden relative">
              <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${players[myId].mp || 100}%` }}></div>
            </div>
            <div className="w-1/2 bg-gray-900/80 rounded-full h-3 border-2 border-gray-700 overflow-hidden relative">
              <div className="bg-amber-600 h-full transition-all duration-300" style={{ width: `${players[myId].hunger ?? 100}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Crosshair */}
      {isFPP && !isInventoryOpen && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-bold text-xl pointer-events-none mix-blend-difference z-20">
          +
        </div>
      )}

      {/* Chat UI Overlay */}
      {activeNpcChat && (
        <div className="absolute bottom-1/4 left-8 z-30 w-96 bg-black/80 border border-indigo-500 rounded-lg overflow-hidden flex flex-col pointer-events-auto shadow-2xl backdrop-blur-sm">
          <div className="bg-indigo-900/50 p-2 border-b border-indigo-500 text-white font-bold flex justify-between items-center">
            <span>Chatting with {activeNpcChat}</span>
            <button onClick={() => setActiveNpcChat(null)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="h-64 overflow-y-auto p-4 flex flex-col gap-2">
            {chatHistory.length === 0 && (
              <p className="text-gray-400 text-sm italic text-center">Say hi to start the conversation!</p>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`p-2 rounded-lg text-sm max-w-[85%] ${msg.sender === 'You' ? 'bg-indigo-600 text-white self-end' : msg.sender === 'System' ? 'bg-red-900/50 text-red-200 self-center' : 'bg-gray-700 text-white self-start'}`}>
                <span className="font-bold text-xs opacity-50 block mb-1">{msg.sender}</span>
                {msg.text}
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="p-2 border-t border-indigo-500/50 flex gap-2">
            <input 
              type="text" 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Say something... (Press Esc to close)"
              className="flex-1 bg-black/50 text-white border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
              autoFocus
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded text-white font-bold">Send</button>
          </form>
        </div>
      )}

      {/* Hand / Weapon View */}
      {isFPP && !isInventoryOpen && (selectedBlockId === 'sword' || selectedBlockId === 'diamond_sword') && (
        <div className={`absolute bottom-0 right-10 z-10 origin-bottom-right transition-transform duration-100 ${isAttacking ? 'rotate-[-60deg] translate-y-10 translate-x-10 scale-125' : 'rotate-[-20deg] scale-100'}`}>
          <div className={`w-12 h-40 rounded-t-full border-4 shadow-[inset_-4px_0_10px_rgba(0,0,0,0.5)] relative ${selectedBlockId === 'diamond_sword' ? 'bg-cyan-400 border-cyan-600 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-slate-400 border-slate-600'}`}>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-4 bg-amber-800 rounded"></div>
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-4 h-12 bg-amber-900"></div>
          </div>
        </div>
      )}

      <InventoryUI 
        isOpen={isInventoryOpen} 
        onClose={() => setIsInventoryOpen(false)} 
        onSelectBlock={(id) => setSelectedBlockId(id)}
        selectedBlockId={selectedBlockId}
        inventory={myId && players[myId] ? players[myId].inventory : {}}
        gamemode={gamemode}
      />

      {activeChestKey && myId && players[myId] && (
        <StorageUI
          isOpen={!!activeChestKey}
          onClose={() => setActiveChestKey(null)}
          chestKey={activeChestKey}
          playerInventory={players[myId].inventory}
          gamemode={gamemode}
        />
      )}

      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 75 }}>
        
        {/* Dynamic Biome Weather & Lighting */}
        <WeatherSystem globalWeatherOverride={globalWeatherOverride} timeOfDay={timeOfDay} />
        
        <VoxelWorld 
          selectedBlockId={selectedBlockId} 
          activeQuest={activeQuest}
          setActiveQuest={setActiveQuest}
          onQuestComplete={handleQuestComplete}
          onOpenChest={(key) => {
            setActiveChestKey(key);
            document.exitPointerLock();
          }}
        />
        
        {/* FirstPersonController handles movement and pointer lock */}
        <FirstPersonController 
          isFPP={isFPP} 
          isUIOpen={isInventoryOpen || !!activeChestKey || !!activeNpcChat}
          gamemode={gamemode}
        />

        {/* Render NPCs (Villagers) */}
        <Villager id="npc1" initialPosition={[5, 10, -5]} hasActiveQuest={!!activeQuest} onAssignQuest={handleAssignQuest} />
        <Villager id="npc2" initialPosition={[-8, 10, 8]} hasActiveQuest={!!activeQuest} onAssignQuest={handleAssignQuest} />
        <Villager id="npc3" initialPosition={[12, 10, 0]} hasActiveQuest={!!activeQuest} onAssignQuest={handleAssignQuest} />

        {/* Render Remote Players */}
        {Object.values(players).map((p) => (
          p.id !== myId && (
            <Player 
              key={p.id}
              id={p.id}
              position={p.position}
              color={p.color}
              isLocal={false}
            />
          )
        ))}
      </Canvas>
    </div>
  );
};

export default GameScene;
