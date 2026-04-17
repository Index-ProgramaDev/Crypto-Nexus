import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';
import { config } from '../config/index.js';

let wss;

// A simple Map to keep track of connected users
// Map<UserId, WebSocketClient>
export const connectedUsers = new Map();

export const initWebSocket = (server) => {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    // Basic Auth via token in query ?token=xyz
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const userId = decoded.userId;

      connectedUsers.set(userId, ws);
      logger.info(`WebSocket User Connected: ${userId}`);

      ws.on('message', (message) => {
        // Handle incoming socket message if needed
        logger.info(`Received socket msg from ${userId}: ${message}`);
      });

      ws.on('close', () => {
        connectedUsers.delete(userId);
        logger.info(`WebSocket User Disconnected: ${userId}`);
      });
      
      ws.on('error', (err) => {
        logger.error(`WebSocket Error from ${userId}:`, err);
      });

    } catch (err) {
      logger.error('WebSocket Auth Error:', err.message);
      ws.close(4001, 'Unauthorized');
    }
  });

  return wss;
};

export const sendToUser = (userId, type, payload) => {
  if (!connectedUsers.has(userId)) return false;

  const ws = connectedUsers.get(userId);
  if (ws && ws.readyState === 1 /* OPEN */) {
    ws.send(JSON.stringify({ type, payload }));
    return true;
  }
  return false;
};
