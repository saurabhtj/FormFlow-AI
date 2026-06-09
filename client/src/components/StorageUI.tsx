import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { INVENTORY_BLOCKS } from './InventoryUI';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chestKey: string;
  playerInventory: Record<string, number>;
  gamemode: 'survival' | 'creative';
}

export const StorageUI = ({ isOpen, onClose, chestKey, playerInventory, gamemode }: Props) => {
  const [chestInventory, setChestInventory] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      socket.emit('openChest', chestKey);
      
      const handleUpdate = (data: { chestKey: string, inventory: Record<string, number> }) => {
        if (data.chestKey === chestKey) {
          setChestInventory(data.inventory);
        }
      };
      
      socket.on('chestUpdated', handleUpdate);
      return () => {
        socket.off('chestUpdated', handleUpdate);
      };
    }
  }, [isOpen, chestKey]);

  if (!isOpen) return null;

  const handleStore = (blockId: string) => {
    socket.emit('storeInChest', { chestKey, blockId, amount: 1 });
  };

  const handleTake = (blockId: string) => {
    socket.emit('takeFromChest', { chestKey, blockId, amount: 1 });
  };

  // Only show blocks the player has
  const playerItems = Object.entries(playerInventory).filter(([_, count]) => count > 0);
  const chestItems = Object.entries(chestInventory).filter(([_, count]) => count > 0);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="bg-amber-900/90 border-4 border-amber-950 w-[800px] h-[600px] rounded-lg shadow-2xl flex flex-col overflow-hidden">
        
        <div className="bg-amber-950 text-amber-200 text-center py-2 font-bold text-xl border-b-4 border-amber-900 relative">
          Chest Storage
          <button onClick={onClose} className="absolute right-4 top-2 hover:text-white">✕</button>
        </div>

        <div className="flex flex-1 p-6 gap-6">
          {/* Left: Chest Inventory */}
          <div className="w-1/2 flex flex-col">
            <h3 className="text-amber-300 font-bold mb-4 text-lg">Chest Contents</h3>
            <div className="bg-black/40 flex-1 rounded p-4 grid grid-cols-4 gap-2 content-start overflow-y-auto">
              {chestItems.length === 0 ? (
                <p className="text-amber-700 col-span-4 text-center italic mt-10">Empty</p>
              ) : (
                chestItems.map(([id, count]) => {
                  const block = INVENTORY_BLOCKS.find(b => b.id === id);
                  if (!block) return null;
                  return (
                    <button key={id} onClick={() => handleTake(id)} className="bg-white/10 hover:bg-white/20 p-2 rounded flex flex-col items-center relative border border-white/5 transition-all">
                      <div className="w-8 h-8 rounded shadow-inner mb-1" style={{ backgroundColor: block.color }}></div>
                      <span className="text-[10px] text-gray-300 truncate w-full text-center">{block.name}</span>
                      <span className="absolute -top-2 -right-2 bg-amber-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Player Inventory */}
          <div className="w-1/2 flex flex-col">
            <h3 className="text-amber-300 font-bold mb-4 text-lg">Your Inventory</h3>
            <div className="bg-black/40 flex-1 rounded p-4 grid grid-cols-4 gap-2 content-start overflow-y-auto">
              {gamemode === 'creative' ? (
                <p className="text-amber-700 col-span-4 text-center italic mt-10">Creative mode has infinite items. Storage is not needed.</p>
              ) : playerItems.length === 0 ? (
                <p className="text-amber-700 col-span-4 text-center italic mt-10">Empty</p>
              ) : (
                playerItems.map(([id, count]) => {
                  const block = INVENTORY_BLOCKS.find(b => b.id === id);
                  if (!block) return null;
                  return (
                    <button key={id} onClick={() => handleStore(id)} className="bg-white/10 hover:bg-white/20 p-2 rounded flex flex-col items-center relative border border-white/5 transition-all">
                      <div className="w-8 h-8 rounded shadow-inner mb-1" style={{ backgroundColor: block.color }}></div>
                      <span className="text-[10px] text-gray-300 truncate w-full text-center">{block.name}</span>
                      <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-amber-500/50 text-xs pb-4">Click items to transfer them. Press Esc to close.</p>

      </div>
    </div>
  );
};
