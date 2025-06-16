// const express = require('express');
// const Stripe = require('stripe');
// const { Order } = require('../models/order');
// require("dotenv").config(); 

// const stripe = Stripe(process.env.STRIPE_KEY); 
// const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; 

// const router = express.Router();


// const createOrder = async (data) => {
//     let productsFromMetadata = [];

//     try {
//         const sessionLineItems = await stripe.checkout.sessions.listLineItems(data.id, {
//             expand: ['data.price.product'], 
//         });

//         console.log('Stripe Line Items Response:', JSON.stringify(sessionLineItems, null, 2));
//         if (!sessionLineItems || !Array.isArray(sessionLineItems.data) || sessionLineItems.data.length === 0) {
//             console.error('No line items found for this session from Stripe.');
//             return;
//         }
//         productsFromMetadata = sessionLineItems.data.map(item => {
//             if (!item.price) {
//                 console.warn(`Line item ${item.id} is missing a price object.`);
//                 return null;
//             }

//             const productData = item.price.product;

//             if (!productData) {
//                 console.warn(`Product data is missing for line item: ${item.id} even after expansion. This might indicate an issue with product creation or linking in Stripe.`);
//                 return null;
//             }

            
//             const productId = productData.metadata && productData.metadata.id ? productData.metadata.id : productData.id;

//             if (!productId) {
//                 console.warn(`Unable to determine a valid product ID for line item: ${item.id}.`);
//                 return null;
//             }

//             return {
//                 id: productId,
//                 name: productData.name,
//                 price: item.price.unit_amount / 100,
//                 image: productData.images && productData.images.length > 0 ? productData.images[0] : null,
//                 cartQuantity: item.quantity,
//             };
//         }).filter(item => item !== null); 
//         if (productsFromMetadata.length === 0) {
//             console.error('No valid products found for order after processing Stripe line items.');
//             return;
//         }

//     } catch (fetchParseError) {
//         console.error('Error fetching or parsing line items from Stripe:', fetchParseError.message);
//         return;
//     }

//     const subtotalInDollars = data.amount_subtotal / 100;
//     const totalInDollars = data.amount_total / 100;

   
//     const userId = data.metadata.userId;
//     if (!userId) {
//         console.error('Error: userId not found in session metadata for order creation.');
//         return;
//     }
//     const newOrder = new Order({
//         userId: userId,
//         customerId: data.customer,
//         paymentIntentId: data.payment_intent,
//         products: productsFromMetadata,
//         subtotal: subtotalInDollars,
//         total: totalInDollars,
//         shipping: data.customer_details,
//         delivery_status: 'pending',
//         payment_status: data.payment_status,
//     });

    
//     try {
//         const savedOrder = await newOrder.save();
//         console.log('Processed Order successfully and saved to DB:', savedOrder);
//     } catch (saveError) {
//         console.error('Error saving order to database:', saveError);
//     }
// };


// router.post('/', express.raw({type: 'application/json'}), async (req, res) => {
//     const sig = req.headers['stripe-signature']; 
//     let event;

//     try {
//         event = stripe.webhooks.constructEvent(
//             req.body,
//             sig,
//             endpointSecret
//         );
//     } catch (err) {
       
//         console.error(`Webhook signature verification failed: ${err.message}`); 
//         return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     const data = event.data.object; 
//     const eventType = event.type;   
    
//     if(eventType === 'checkout.session.completed'){
//         try {
//             console.log('Attempting to create order from checkout.session.completed event...');
//             await createOrder(data);
//             console.log('createOrder function finished and likely saved data.');
//         } catch (err) {
//             console.error('Error in createOrder function called from webhook:', err.message);
//         }
//     } else {
//         console.log(`Unhandled event type: ${eventType}`);
//     }

//     res.status(200).end();
// });

// module.exports = router;