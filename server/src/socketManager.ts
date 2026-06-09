import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

interface PlayerState {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  hp: number;
  mp: number;
  hunger: number;
  gamemode: 'survival' | 'creative';
  inventory: Record<string, number>;
  careers: Record<string, number>;
}

const players: Record<string, PlayerState> = {};
const worldBlocks: Record<string, string> = {};
const chests: Record<string, Record<string, number>> = {}; // Key: "x,y,z", Value: inventory map

// Global Weather Override (null means biome-based)
let globalWeatherOverride: 'clear' | 'rain' | 'snow' | null = null;

// Global Time of Day (0 to 24)
let timeOfDay = 8; // Start at 8 AM

// Fetch Real Weather for Trivandrum, Kerala (Lat 8.5241, Lon 76.9366)
const fetchRealWeather = async () => {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=8.5241&longitude=76.9366&current_weather=true');
    const data = await res.json();
    const code = data.current_weather?.weathercode || 0;
    
    // WMO Weather interpretation codes: 
    // 0-3 = Clear/Cloudy
    // 51-67, 80-82, 95-99 = Rain/Showers/Thunderstorm
    // 71-77, 85-86 = Snow
    let newWeather: 'clear' | 'rain' | 'snow' = 'clear';
    if (code >= 51 && code <= 67 || code >= 80 && code <= 82 || code >= 95) newWeather = 'rain';
    else if (code >= 71 && code <= 77 || code >= 85 && code <= 86) newWeather = 'snow';
    
    if (globalWeatherOverride !== newWeather) {
      globalWeatherOverride = newWeather;
      console.log(`Real Weather Updated: ${newWeather} (Code: ${code})`);
      // Note: We can't use io here easily unless we pass io or emit it where io is accessible.
      // We will emit it in the main interval.
    }
  } catch (err) {
    console.error('Failed to fetch real weather', err);
  }
};

// Initial fetch
fetchRealWeather();
setInterval(fetchRealWeather, 5 * 60 * 1000); // Every 5 minutes

export const setupSocketIO = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for the prototype
      methods: ['GET', 'POST']
    }
  });

  // Tick time every second (1 real second = 1 game minute roughly)
  // Let's make a full day take 24 minutes (1 hour game time = 1 real minute)
  setInterval(() => {
    timeOfDay += 1 / 60; // Adds 1 hour every 60 seconds
    if (timeOfDay >= 24) timeOfDay = 0;
    io.emit('timeUpdate', timeOfDay);
    // Also emit real weather override just in case clients join or it updates
    io.emit('weatherOverride', globalWeatherOverride);
  }, 1000);

  // Survival Mechanics Tick (every 10 seconds)
  setInterval(() => {
    let stateChanged = false;
    Object.values(players).forEach(p => {
      if (p.gamemode === 'survival') {
        if (p.hunger > 0) {
          p.hunger -= 2; // Lose 2 hunger every 10 seconds
          if (p.hunger < 0) p.hunger = 0;
        } else {
          p.hp -= 5; // Starvation damage
          if (p.hp <= 0) {
            p.hp = 100;
            p.hunger = 100;
            p.position = [0, 10, 0]; // Respawn
          }
        }
        
        // Healing if full hunger
        if (p.hunger > 80 && p.hp < 100) {
          p.hp += 5;
          if (p.hp > 100) p.hp = 100;
        }
        stateChanged = true;
      }
    });
    if (stateChanged) {
      io.emit('currentPlayers', players);
    }
  }, 10000);

  io.on('connection', (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);

    const color = '#' + Math.floor(Math.random()*16777215).toString(16);

    players[socket.id] = {
      id: socket.id,
      position: [0, 10, 0], 
      rotation: [0, 0, 0],
      color,
      hp: 100,
      mp: 100,
      hunger: 100,
      gamemode: 'survival',
      inventory: {},
      careers: {}
    };

    socket.emit('currentPlayers', players);
    socket.emit('worldBlocks', worldBlocks);
    socket.emit('weatherOverride', globalWeatherOverride); // Send weather on join
    socket.emit('timeUpdate', timeOfDay);

    socket.broadcast.emit('playerJoined', players[socket.id]);

    socket.on('playerMovement', (movementData: { position: [number, number, number], rotation: [number, number, number] }) => {
      if (players[socket.id]) {
        players[socket.id].position = movementData.position;
        players[socket.id].rotation = movementData.rotation;
        socket.broadcast.emit('playerMoved', players[socket.id]);
      }
    });

    socket.on('setGamemode', (gamemode: 'survival' | 'creative') => {
      if (players[socket.id]) {
        players[socket.id].gamemode = gamemode;
        io.emit('currentPlayers', players);
      }
    });

    socket.on('setAvatar', (color: string) => {
      if (players[socket.id]) {
        players[socket.id].color = color;
        io.emit('currentPlayers', players);
      }
    });

    // Creative mode weather control
    socket.on('setGlobalWeather', (weatherType: 'clear' | 'rain' | 'snow' | null) => {
      if (players[socket.id] && players[socket.id].gamemode === 'creative') {
        globalWeatherOverride = weatherType;
        io.emit('weatherOverride', globalWeatherOverride);
      }
    });

    // PvP Combat Logic
    socket.on('attackSweep', (weaponId?: string) => {
      const attacker = players[socket.id];
      if (!attacker) return;

      const ATTACK_RANGE = 3;
      let hitSomeone = false;

      Object.values(players).forEach(target => {
        if (target.id !== attacker.id && target.gamemode === 'survival') {
          const dx = attacker.position[0] - target.position[0];
          const dy = attacker.position[1] - target.position[1];
          const dz = attacker.position[2] - target.position[2];
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          
          if (dist <= ATTACK_RANGE) {
            const damage = weaponId === 'diamond_sword' ? 80 : 40;
            target.hp -= damage; 
            hitSomeone = true;
            
            // Award Fighter XP
            attacker.careers['Fighter'] = (attacker.careers['Fighter'] || 0) + 20;

            if (target.hp <= 0) {
              target.hp = 100;
              target.position = [0, 10, 0]; // Respawn at center
            }
          }
        }
      });

      if (hitSomeone) {
        io.emit('currentPlayers', players); // Broadcast updated HP
      }
    });

    // Optional: Keep old attackPlayer for reference or remove it completely

    socket.on('placeBlock', (data: { position: [number, number, number], color: string }) => {
       const blockId = data.color;
       const player = players[socket.id];
       
       if (player && player.gamemode === 'survival') {
         if (!player.inventory[blockId] || player.inventory[blockId] <= 0) {
           return; // Prevent placing if they don't have it
         }
         player.inventory[blockId] -= 1;
         
         // Award Builder XP
         player.careers['Builder'] = (player.careers['Builder'] || 0) + 10;
         
         io.emit('currentPlayers', players); // Send updated inventory and careers
       }

       const key = data.position.join(',');
       worldBlocks[key] = blockId;
       socket.broadcast.emit('blockPlaced', { key, color: blockId });
    });

    socket.on('destroyBlock', (data: { key: string, blockId: string }) => {
       const { key, blockId } = data;
       
       if (worldBlocks[key]) {
         delete worldBlocks[key];
       }
       
       const player = players[socket.id];
       if (player && player.gamemode === 'survival' && blockId) {
         player.inventory[blockId] = (player.inventory[blockId] || 0) + 1;
         
         // Award Miner XP
         player.careers['Miner'] = (player.careers['Miner'] || 0) + 15;
         
         io.emit('currentPlayers', players); // Send updated inventory and careers
       }
       
       socket.broadcast.emit('blockDestroyed', key);
    });

    socket.on('craftItem', (itemId: string) => {
      const player = players[socket.id];
      if (player && player.gamemode === 'survival') {
        if (itemId === 'sword') {
          // Requires 2 oak_wood, 1 stone
          const wood = player.inventory['oak_wood'] || 0;
          const stone = player.inventory['stone'] || 0;
          if (wood >= 2 && stone >= 1) {
            player.inventory['oak_wood'] -= 2;
            player.inventory['stone'] -= 1;
            player.inventory['sword'] = (player.inventory['sword'] || 0) + 1;
            io.emit('currentPlayers', players);
          }
        } else if (itemId === 'diamond_sword') {
          // Requires 1 sword, 2 diamond_ore
          const sword = player.inventory['sword'] || 0;
          const diamond = player.inventory['diamond_ore'] || 0;
          if (sword >= 1 && diamond >= 2) {
            player.inventory['sword'] -= 1;
            player.inventory['diamond_ore'] -= 2;
            player.inventory['diamond_sword'] = (player.inventory['diamond_sword'] || 0) + 1;
            io.emit('currentPlayers', players);
          }
        }
      }
    });

    socket.on('storeInChest', (data: { chestKey: string, blockId: string, amount: number }) => {
      const { chestKey, blockId, amount } = data;
      const player = players[socket.id];
      if (player && player.gamemode === 'survival') {
        if (player.inventory[blockId] >= amount) {
          player.inventory[blockId] -= amount;
          if (!chests[chestKey]) chests[chestKey] = {};
          chests[chestKey][blockId] = (chests[chestKey][blockId] || 0) + amount;
          io.emit('currentPlayers', players);
          socket.emit('chestUpdated', { chestKey, inventory: chests[chestKey] });
        }
      }
    });

    socket.on('takeFromChest', (data: { chestKey: string, blockId: string, amount: number }) => {
      const { chestKey, blockId, amount } = data;
      const player = players[socket.id];
      if (player && player.gamemode === 'survival') {
        if (chests[chestKey] && chests[chestKey][blockId] >= amount) {
          chests[chestKey][blockId] -= amount;
          player.inventory[blockId] = (player.inventory[blockId] || 0) + amount;
          io.emit('currentPlayers', players);
          socket.emit('chestUpdated', { chestKey, inventory: chests[chestKey] });
        }
      }
    });

    // Send chest inventory when opened
    socket.on('openChest', (chestKey: string) => {
      if (!chests[chestKey]) chests[chestKey] = {};
      socket.emit('chestUpdated', { chestKey, inventory: chests[chestKey] });
    });

    socket.on('eatFood', () => {
      const player = players[socket.id];
      if (player && player.gamemode === 'survival') {
        if (player.inventory['apple'] > 0) {
          player.inventory['apple'] -= 1;
          player.hunger += 30;
          if (player.hunger > 100) player.hunger = 100;
          io.emit('currentPlayers', players);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      delete players[socket.id];
      io.emit('playerLeft', socket.id);
    });
  });
};
