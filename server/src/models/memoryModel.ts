import { db } from '../database';

export interface NPCMemory {
  id?: number;
  playerId: string;
  npcId: string;
  memoryType: string; // e.g., 'HELPED_FIND_MEDICINE', 'BETRAYED', 'FRIENDSHIP'
  relationshipScore: number;
  timestamp?: Date;
}

export const MemoryModel = {
  // Create table if not exists
  async init() {
    const query = `
      CREATE TABLE IF NOT EXISTS npc_memories (
        id SERIAL PRIMARY KEY,
        player_id VARCHAR(100) NOT NULL,
        npc_id VARCHAR(100) NOT NULL,
        memory_type VARCHAR(100) NOT NULL,
        relationship_score INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    try {
      await db.query(query);
      console.log('npc_memories table initialized');
    } catch (err) {
      console.error('Error creating table', err);
    }
  },

  async addMemory(memory: NPCMemory) {
    const query = `
      INSERT INTO npc_memories (player_id, npc_id, memory_type, relationship_score)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [memory.playerId, memory.npcId, memory.memoryType, memory.relationshipScore];
    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (err) {
      console.error('Error adding memory', err);
      return null;
    }
  },

  async getMemories(playerId: string, npcId: string) {
    const query = `
      SELECT * FROM npc_memories
      WHERE player_id = $1 AND npc_id = $2
      ORDER BY timestamp DESC
      LIMIT 10;
    `;
    try {
      const result = await db.query(query, [playerId, npcId]);
      return result.rows;
    } catch (err) {
      console.error('Error fetching memories', err);
      return [];
    }
  }
};
