const cookieSession = require('cookie-session');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const register = require('./routes/register');
const login = require('./routes/login');
const authRouter = require('./routes/googleRoutes');
const productRoute = require('./routes/productRoute');
const orderRouter = require('./routes/orderRoute');
const usersRoute = require('./routes/userRoutes');

const checkoutRoutes = require('./routes/checkout');
const webhookRoutes = require('./routes/webhook');

const app = express();
require('dotenv').config();

const PORT = process.env.PORT || 3000;

app.use('/api/stripe/webhook', webhookRoutes); 
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin:'http://localhost:5173',
    credentials:true
}))
app.use(express.json());
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.originalUrl}`);
  if (req.originalUrl !== '/api/stripe/webhook') {
    console.log('Request Body:', req.body);
  }
  next();
});

app.use(cookieSession(
    {
        name:'session',
        keys:['Arome'],
        maxAge: 24 * 60 * 60 * 100
    }
));
app.use(cookieParser());

app.use('/api/auth' , authRouter);
app.use('/api/product' , productRoute);
app.use('/api/order' , orderRouter);
app.use('/api/users' , usersRoute);
app.use('/api/register' , register);
app.use('/api/login' , login);
app.use('/api/stripe', checkoutRoutes);

app.get('/' , (req , res)=>{
    res.send('welcome to our online shop Api...')
})

app.get('/api/register' , (req , res)=>{
    res.send('If you want sign up write data here...')
})
app.get('/api/login' , (req , res)=>{
    res.send('write your data here to submit and sign in...')
});
app.get('/api/product' , (req , res)=>{
    res.send('Here you can found all our products...')
});
app.get('/api/order' , (req , res)=>{
    res.send('Here you can found all our orders...')
});
app.get('/api/users' , (req , res)=>{
    res.send('Here you can found all our users...')
});
app.get('/api/stripe' , (req , res)=>{
    res.send('Here payment method stripe is valid...')
});
app.get('/api/auth' , (req , res)=>{
    res.send('Sign in with google...')
});


// mongoose.connect(process.env.DB_URL, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
//   serverSelectionTimeoutMS: 50000,
//   socketTimeoutMS: 45000,
// })
// .then(() => {
//   console.log('Database Connected Successfully!');
// })
// .catch((err) => {
//   console.log('Database Connection Failed...');
//   console.error(err);
// });


mongoose.connect(process.env.DB_URL, {
    serverSelectionTimeoutMS: 50000,
    socketTimeoutMS: 45000,
})
.then(() => {
    console.log('Database Connected Successfully!');
})
.catch((err) => {
    console.log('Database Connection Failed...');
    console.error(err);
});

app.listen(PORT , ()=>{
    console.log('server is Running on port:' , PORT)
})