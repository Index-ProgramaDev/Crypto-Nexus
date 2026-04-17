import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse JSON body for POST requests
  if (req.method === 'POST') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      // Body already parsed or empty
    }
  }

  try {
    // Simple health check
    if (req.url === '/health') {
      return res.status(200).json({ status: 'ok', message: 'Backend is working!' });
    }

    // Login endpoint
    if (req.url === '/auth/login' && req.method === 'POST') {
      const { email, password } = req.body;
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true }
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            profile: user.profile
          },
          tokens: { accessToken: token }
        }
      });
    }

    // Default response
    return res.status(404).json({ error: 'Not found' });
    
  } catch (error) {
    console.error('Backend error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
}
