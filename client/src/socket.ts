import { io } from 'socket.io-client';

// Connect to the Node.js backend running on port 3000
export const socket = io('http://localhost:3000');
