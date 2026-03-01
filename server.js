require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { testConnection } = require('./config/database');
const { syncDatabase } = require('./models');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const storeRoutes = require('./routes/store');
const { setupGameSocket } = require('./sockets/gameSocket');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// In-memory room storage
const rooms = {};

// Get CORS origins from environment
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:5174'];

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(helmet()); // Secure HTTP headers
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json());

// Main App Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/', apiLimiter);

// Share rooms with room routes
roomRoutes.setRooms(rooms);

// Routes
app.use('/', authRoutes);
app.use('/', roomRoutes);
app.use('/', storeRoutes);

// Centralized Error Handling
app.use(errorHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    game: 'CHAMPUL',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Get server info for LAN play
app.get('/server-info', (req, res) => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const addresses = [];

  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    });
  });

  res.json({
    addresses,
    port: PORT,
    game: 'CHAMPUL'
  });
});

// Setup Socket.IO game handlers
setupGameSocket(io, rooms);

// Server port
const PORT = process.env.PORT || 3001;

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Sync database models
    await syncDatabase();

    // Start listening
    server.listen(PORT, '0.0.0.0', () => {
      console.log('╔════════════════════════════════════════╗');
      console.log('║          CHAMPUL GAME SERVER           ║');
      console.log('╠════════════════════════════════════════╣');
      console.log(`║  Server running on port ${PORT}            ║`);
      console.log(`║  http://localhost:${PORT}                 ║`);
      console.log('║                                        ║');
      console.log('║  For LAN play, use your local IP:      ║');
      console.log(`║  http://<your-ip>:${PORT}                 ║`);
      console.log('╚════════════════════════════════════════╝');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
