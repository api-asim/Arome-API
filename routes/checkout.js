const express = require('express');
const Stripe = require('stripe');
require("dotenv").config();

const stripe = Stripe(process.env.STRIPE_KEY);
const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {
    const {carts, userId} = req.body;
    const cartItems = req.body.carts;
    console.log('Received userId from frontend in checkout.js:', userId);

    const customer = await stripe.customers.create({
        metadata:{
            userId:req.body.userId,
        },
    });

    if (!carts || !Array.isArray(carts) || carts.length === 0) {
        return res.status(400).json({ message: "Cart items are missing or empty." });
    }

    const line_items = carts.map((item, index) => {
        const price = parseFloat(item.cost);
        const quantity = parseInt(item.cartQuantity);
        const itemName = item.title || item._id || `Unknown Item (Index: ${index})`;

        if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) {
            throw new Error(`Invalid price or quantity for item: ${itemName}`);
        }

        return {
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.title,
                    images: [item.imageURL.url],
                    description: item.type,
                    metadata: {
                        id: item._id,
                    }
                },
                unit_amount: Math.round(price * 100),
            },
            quantity: quantity,
        };
    });

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types:['card'],
            shipping_address_collection:{
                allowed_countries:['US', 'CA', 'KE', 'EG'],
            },
            shipping_options:[
                {
                    shipping_rate_data:{
                        type:'fixed_amount',
                        fixed_amount:{
                            amount:0,
                            currency:'usd',
                        },
                        display_name:'Free shipping',
                        delivery_estimate:{
                            minimum:{
                                unit:'business_day',
                                value:5,
                            },
                            maximum:{
                                unit:'business_day',
                                value:7,
                            },
                        }
                    }
                },
                {
                    shipping_rate_data:{
                        type:'fixed_amount',
                        fixed_amount:{
                            amount:2000,
                            currency:'usd',
                        },
                        display_name:'Next day air',
                        delivery_estimate:{
                            minimum:{
                                unit:'business_day',
                                value:1,
                            },
                            maximum:{
                                unit:'business_day',
                                value:1,
                            },
                        }
                    }
                }
            ],
            phone_number_collection:{
                enabled: true,
            },
            customer:customer.id,
            line_items,
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/checkout-success`,
            cancel_url: `${process.env.CLIENT_URL}/cart`,
            metadata: {
                userId: userId,
            },
        });
        res.send({ url: session.url });
    } catch (error) {
        console.error("Error creating Stripe checkout session:", error);
        res.status(500).json({ message: "Failed to create checkout session.", error: error.message });
    }
});

module.exports = router;