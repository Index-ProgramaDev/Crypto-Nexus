import app from './backend/src/server.js';

export default async function handler(req, res) {
  return app(req, res);
}
