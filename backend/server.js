const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger for debugging
app.use((req, res, next) => {
    if (req.path.startsWith('/api/auth')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
});

// Database connection
const db = require('./db');

// Routes
const authRoutes = require('./routes/auth');
const grievanceRoutes = require('./routes/grievances');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Checks
app.get('/api/ping', (req, res) => res.json({ status: 'active', timestamp: new Date() }));
app.get('/api/diag', (req, res) => {
    res.json({
        service: 'Neural Backend',
        port: PORT,
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        env: process.env.NODE_ENV || 'development'
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`  GrievanceAI Backend - Port ${PORT}`);
    console.log(`  Database: ${process.env.MONGODB_URI}`);
    console.log(`========================================`);
});
