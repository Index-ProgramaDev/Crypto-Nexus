import app from '../src/server.js';

// Vercel serverless handler
export default async function handler(req, res) {
  // Connect to database before handling request
  const { testConnection } = await import('../src/config/database.js');
  
  try {
    await testConnection();
    await app(req, res);
  } catch (error) {
    console.error('Serverless error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}
