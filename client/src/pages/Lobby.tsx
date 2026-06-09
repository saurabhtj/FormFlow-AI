import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const avatars = [
  { id: 'freaken', name: 'Freaken (Cool Kid)', color: '#FF3366' },
  { id: 'thattukada', name: 'Thattukada Uncle', color: '#FF9900' },
  { id: 'techie', name: 'IT Techie', color: '#33CCFF' },
  { id: 'tourist', name: 'Confused Tourist', color: '#33FF99' },
];

const Lobby = () => {
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const navigate = useNavigate();

  const handleJoin = () => {
    // Pass the selected avatar color to the GameScene via state
    navigate('/play', { state: { avatarColor: selectedAvatar.color } });
  };

  return (
    <div className="min-h-screen bg-navy-900 text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute w-[800px] h-[800px] bg-indigo-600/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>

      <div className="glass p-12 rounded-3xl z-10 max-w-2xl w-full mx-4">
        <h1 className="text-4xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
          Welcome to StoryForge
        </h1>
        <p className="text-gray-400 text-center mb-10">Select your avatar to enter the pixel world</p>

        <div className="grid grid-cols-2 gap-4 mb-10">
          {avatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => setSelectedAvatar(avatar)}
              className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4
                ${selectedAvatar.id === avatar.id 
                  ? 'border-indigo-500 bg-white/10' 
                  : 'border-white/5 bg-black/40 hover:bg-white/5'}`}
            >
              <div 
                className="w-10 h-10 rounded-full shadow-lg" 
                style={{ backgroundColor: avatar.color }}
              ></div>
              <span className="font-medium text-lg">{avatar.name}</span>
            </button>
          ))}
        </div>

        <button 
          onClick={handleJoin}
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-bold text-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
        >
          Join Server
        </button>
      </div>
    </div>
  );
};

export default Lobby;
