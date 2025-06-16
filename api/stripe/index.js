const express = require('express');
const Stripe = require('stripe');
const Order = require('../../models/order'); 

const mongoose = require('mongoose');
require('dotenv').config();

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

const app = express();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/api/stripe', async (req, res) => {
    let event;
    let requestBody;

    // قراءة الـ raw body يدوياً، هذا ضروري لـ Stripe
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    await new Promise((resolve) => req.on('end', resolve));
    requestBody = Buffer.concat(chunks);

    const sig = req.headers['stripe-signature'];

    console.log('Stripe webhook received!');
    console.log('Request Headers:', req.headers);
    console.log('Request Body (raw, partial):', requestBody ? requestBody.toString().substring(0, 500) + '...' : 'Empty');

    try {
        event = stripe.webhooks.constructEvent(requestBody, sig, webhookSecret);
        console.log('Webhook signature verified successfully.');
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Stripe Webhook Event Type:', event.type);

    try {
        await connectToDatabase(); 
        console.log('Database connection attempted from webhook.');
    } catch (dbErr) {
        console.error('Failed to connect to database from webhook:', dbErr.message);
    }

    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('Attempting to create order from checkout.session.completed event...');
            console.log('Session Data:', JSON.stringify(session, null, 2));

            if (session.payment_status === 'paid') {
                try {
                    const customerEmail = session.customer_details ? session.customer_details.email : null;
                    const shippingAddress = session.shipping_details ? session.shipping_details.address : {};
                    const amountTotal = session.amount_total;
                    const currency = session.currency;
                    const paymentIntentId = session.payment_intent;
                    const customerId = session.customer;

                    const newOrder = new Order({
                        userId: customerId || 'guest',
                        customerEmail: customerEmail,
                        products: [], 
                        totalAmount: amountTotal / 100,
                        currency: currency,
                        paymentIntentId: paymentIntentId,
                        shippingAddress: {
                            street: shippingAddress.line1,
                            city: shippingAddress.city,
                            state: shippingAddress.state,
                            zip: shippingAddress.postal_code,
                            country: shippingAddress.country,
                        },
                        status: 'pending'
                    });

                    console.log('Order object to be saved:', JSON.stringify(newOrder, null, 2));

                    const savedOrder = await newOrder.save();
                    console.log('Processed Order successfully and saved to DB:', savedOrder);

                } catch (error) {
                    console.error('Error processing checkout.session.completed (internal):', error.message);
                    console.error('Stack:', error.stack);
                }
            } else {
                console.log('Checkout session not paid, skipping order creation.');
            }
            break;
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).send('Webhook Received');
});

module.exports = app;