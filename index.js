const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
require('dotenv').config();

const register = require('./routes/register');
const login = require('./routes/login');
const authRouter = require('./routes/googleRoutes');
const productRoute = require('./routes/productRoute');
const orderRouter = require('./routes/orderRoute');
const usersRoute = require('./routes/userRoutes');
const checkoutRoutes = require('./routes/checkout');
// // const webhookRoutes = require('./routes/webhook'); // <-- احذف هذا السطر

const app = express();

let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && cachedDb.connections[0].readyState === 1) {
        console.log('Using existing database connection');
        return cachedDb;
    }

    if (!process.env.DB_URL) {
        console.error('DB_URL environment variable is not set!');
        throw new Error('DB_URL environment variable is not set! Please configure it.');
    }

    try {
        console.log('Attempting new MongoDB connection...');
        const connection = await mongoose.connect(process.env.DB_URL, {
            bufferCommands: false,
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 30000,
            connectTimeoutMS: 30000,
        });
        cachedDb = connection;
        console.log('New MongoDB connection established successfully.');
        return cachedDb;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        cachedDb = null;
        throw error;
    }
}

app.use(async (req, res, next) => {
    if (req.originalUrl === '/api/stripe/webhook') {
        return next();
    }

    try {
        await connectToDatabase();
        next();
    } catch (error) {
        console.error(`Failed to connect to database for ${req.originalUrl}: ${error.message}`);
        return res.status(500).json({
            message: 'Database connection issue. Please try again later.',
            error: error.message
        });
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: process.env.VERCEL_LINK || 'http://localhost:5173',
    credentials: true,
}));

app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.originalUrl}`);
    if (req.originalUrl !== '/api/stripe/webhook') {
        console.log('Request Body:', req.body);
    }
    next();
});

app.use(cookieSession({
    name: 'session',
    keys: [process.env.COOKIE_KEY || 'AromeSecretKey'],
    maxAge: 24 * 60 * 60 * 1000
}));
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/product', productRoute);
app.use('/api/order', orderRouter);
app.use('/api/users', usersRoute);
app.use('/api/register', register);
app.use('/api/login', login);
app.use('/api/stripe', checkoutRoutes);


app.get('/', (req, res) => {
    res.send('Welcome to our online shop API...');
});

app.get('/api/register', (req, res) => { res.send('If you want to sign up, send data here...'); });
app.get('/api/login', (req, res) => { res.send('Send your data here to submit and sign in...'); });
app.get('/api/product', (req, res) => { res.send('Here you can find all our products...'); });
app.get('/api/order', (req, res) => { res.send('Here you can find all our orders...'); });
app.get('/api/users', (req, res) => { res.send('Here you can find all our users...'); });
app.get('/api/stripe', (req, res) => { res.send('Stripe payment method is valid here...'); });
app.get('/api/auth', (req, res) => { res.send('Sign in with Google...'); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}!`);
});

module.exports = app;