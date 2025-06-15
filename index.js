const cookieSession = require('cookie-session');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
require('dotenv').config(); 

// 2. Import Routes Files
const register = require('./routes/register');
const login = require('./routes/login');
const authRouter = require('./routes/googleRoutes');
const productRoute = require('./routes/productRoute');
const orderRouter = require('./routes/orderRoute');
const usersRoute = require('./routes/userRoutes');
const checkoutRoutes = require('./routes/checkout');
const webhookRoutes = require('./routes/webhook'); 

const app = express();

let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        console.log('Using existing database connection');
        return cachedDb;
    }

    if (!process.env.DB_URL) {
        console.error('DB_URL environment variable is not set!');
        throw new Error('DB_URL environment variable is not set!');
    }

    try {
        const connection = await mongoose.connect(process.env.DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            bufferCommands: false,
            bufferTimeoutMS: 30000,
            serverSelectionTimeoutMS: 15000, 
            socketTimeoutMS: 30000, 
        });

        
        cachedDb = connection.connections[0].db;
        console.log('New MongoDB connection established');
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
        res.status(500).json({
            message: 'Database connection issue. Please try again later.',
            error: error.message
        });
    }
});

app.use('/api/stripe/webhook', webhookRoutes);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(cors({
    origin:'http://localhost:5173',
    credentials: true 
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
    keys: ['Arome'],
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

module.exports = app;