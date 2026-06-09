import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MemoryModel } from '../models/memoryModel';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MOCK_KEY');

export const generateNPCDialogue = async (req: Request, res: Response) => {
  const { playerId, npcId, action } = req.body;

  if (!playerId || !npcId) {
    return res.status(400).json({ error: 'playerId and npcId are required' });
  }

  try {
    // 1. Fetch previous memories from PostgreSQL
    const memories = await MemoryModel.getMemories(playerId, npcId);
    
    // 2. Format memories for the AI Prompt
    const memoryString = memories.length > 0 
      ? memories.map(m => `Past action: ${m.memory_type}, Relationship Score: ${m.relationship_score}`).join('\n')
      : 'No previous interaction. First meeting.';

    // 3. Construct Prompt for Gemini
    const prompt = `
      You are an NPC in an open-world RPG game set in a unique cultural setting, highly influenced by Kerala (Malayalam) culture.
      You speak in a mix of English and Malayalam (Manglish). 
      You MUST use original, funny, and viral Malayalam meme references and local slang. 
      Do not copy movie dialogues directly, but channel the energy of famous actors like Suraj Venjaramoodu, Jagathy, or Salim Kumar.
      
      Viral Contexts & Vibes to include:
      - "Oru rakshayum illa" (No salvation/Unbelievable)
      - "Scene contra" (Things are bad/complicated)
      - "Polichu machane" (Awesome bro)
      - Referencing freaken (cool kids), thattukada (street food), chaya (tea), and KSRTC buses.
      
      Examples of your humor:
      - "Chetta, mission edukkan vannathano, allenkil chumma nadakkanano? Ithu panchayat ground alla!"
      - "Ningal vannappol server thanne tension aayi! Ping 999+ aayi machane!"
      - "Ee village-il wifi illa, pakse gossip speed 5G aanu! Kettille aa puthiya update?"
      - "Njangalude thattukadayil irunnu oru chaya kudichittu aakam thallu!"
      
      Player ID: ${playerId}
      NPC ID: ${npcId}
      
      Previous Memories with this Player:
      ${memoryString}
      
      Current Action by Player: ${action || 'Just approaching'}
      
      Generate a short (1-2 sentences), humorous, and personalized dialogue based on the memory and the current action. Keep the tone friendly but witty.
    `;

    // Mock response if no API key is set
    if (!process.env.GEMINI_API_KEY) {
       return res.json({
         dialogue: `(Mocked) "Ningal vannappol server thanne tension aayi!" - Player ${playerId}`,
         memories
       });
    }

    // 4. Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const dialogue = response.text();

    // 5. Save this interaction as a memory
    await MemoryModel.addMemory({
      playerId,
      npcId,
      memoryType: `Player said: "${action || 'approached'}". AI replied: "${dialogue.substring(0, 60)}..."`,
      relationshipScore: 1 // Base increment
    });

    res.json({
      dialogue,
      memoriesUsed: memories.length
    });

  } catch (error) {
    console.error('Error generating NPC dialogue:', error);
    res.status(500).json({ error: 'Failed to generate dialogue' });
  }
};
