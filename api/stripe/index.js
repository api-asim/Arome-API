const express = require('express');
const Stripe = require('stripe');
const connectDB = require('../../db');
const Order = require('../../models/order');
const app = express();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    console.log('Stripe webhook received!');
    console.log('Request Headers:', req.headers); 
    console.log('Request Body (raw):', req.body ? req.body.toString().substring(0, 500) + '...' : 'Empty'); 
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log('Webhook signature verified successfully.');
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Stripe Webhook Event Type:', event.type); 
    try {
        await connectDB();
        console.log('Database connection attempted from webhook.');
    } catch (dbErr) {
        console.error('Failed to connect to database from webhook:', dbErr.message);
        return res.status(500).send('Database connection error');
    }

    // Handle the event
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
                    console.error('Error processing checkout.session.completed:', error.message);
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
        case 'payment_method.attached':
            const paymentMethod = event.data.object;
            console.log('PaymentMethod was attached to a Customer!');
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
    res.status(200).send('Webhook Received');
});

module.exports = app;