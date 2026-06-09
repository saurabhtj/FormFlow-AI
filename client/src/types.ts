export interface Quest {
  id: string;
  type: 'place' | 'destroy';
  blockId: string;
  targetCount: number;
  currentCount: number;
  description: string;
}

export interface PlayerState {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  hp?: number;
  mp?: number;
  hunger?: number;
  gamemode?: 'survival' | 'creative';
  inventory?: Record<string, number>;
  careers?: Record<string, number>;
}
