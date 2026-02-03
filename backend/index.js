import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passportConfig from './config/passport.js';
import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chat.routes.js';

dotenv.config();

const app = express();

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passportConfig.initialize());

// NO MORE connectDB() - Prisma handles connections automatically!

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', chatRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🐘 PostgreSQL connected via Prisma`);
  console.log(`🔐 Google OAuth: GET http://localhost:${PORT}/api/auth/google`);
});

export default app;