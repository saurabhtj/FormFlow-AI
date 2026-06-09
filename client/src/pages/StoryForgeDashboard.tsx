import React, { useState } from 'react';

const StoryForgeDashboard = () => {
  const [npcDialogue, setNpcDialogue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDialogue = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/npc/dialogue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: 'player123',
          npcId: 'npc_elder_01',
          action: 'Asking for a quest'
        })
      });
      const data = await response.json();
      setNpcDialogue(data.dialogue);
    } catch (error) {
      console.error('Error fetching dialogue', error);
      setNpcDialogue("Error fetching dialogue from server.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white font-inter relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/30 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/30 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              StoryForge Ultimate
            </h1>
            <p className="text-gray-400 mt-2">Server Management & AI Dashboard</p>
          </div>
          <div className="flex gap-4">
            <span className="px-4 py-2 rounded-full glass text-sm font-medium text-green-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Servers Online
            </span>
            <span className="px-4 py-2 rounded-full glass text-sm font-medium flex items-center gap-2">
              👥 1,402 Players
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Server Stats */}
          <div className="glass p-6 rounded-2xl md:col-span-2">
            <h2 className="text-xl font-semibold mb-6">Live Server Telemetry</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-sm text-gray-400">CPU Usage</p>
                <p className="text-2xl font-bold text-indigo-400">42%</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-sm text-gray-400">RAM</p>
                <p className="text-2xl font-bold text-purple-400">16.4 GB</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-sm text-gray-400">Active NPCs</p>
                <p className="text-2xl font-bold text-blue-400">8,932</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-sm text-gray-400">Quests Gen.</p>
                <p className="text-2xl font-bold text-pink-400">1.2M</p>
              </div>
            </div>
          </div>

          {/* AI NPC Test Panel */}
          <div className="glass p-6 rounded-2xl flex flex-col">
            <h2 className="text-xl font-semibold mb-2">AI Memory Testing</h2>
            <p className="text-sm text-gray-400 mb-6">Test the Gemini-powered NPC dialogue generation.</p>
            
            <button 
              onClick={fetchDialogue}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Simulate Player Interaction'}
            </button>

            <div className="mt-6 flex-1 bg-black/40 rounded-xl p-4 border border-white/5 overflow-y-auto">
              {npcDialogue ? (
                <p className="text-gray-300 italic">"{npcDialogue}"</p>
              ) : (
                <p className="text-gray-500 text-center text-sm mt-4">No dialogue generated yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Map visualization placeholder */}
        <div className="mt-8 glass p-6 rounded-2xl h-80 flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
             <div className="text-center z-10">
                <h3 className="text-2xl font-bold mb-2">Global Heatmap</h3>
                <p className="text-gray-400">Real-Location Resource Spawns tracking via ARCore/ARKit active.</p>
             </div>
        </div>

      </div>
    </div>
  );
};

export default StoryForgeDashboard;
