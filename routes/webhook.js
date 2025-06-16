const express = require('express');
const Stripe = require('stripe');
const { Order } = require('../models/order');
require("dotenv").config(); // تأكد أن هذا السطر موجود في بداية ملفك الرئيسي (مثل index.js أو server.js) لتحميل متغيرات البيئة

// هذا هو الشكل الصحيح: لا يوجد مفتاح سري هنا!
// المفتاح سيُقرأ من متغيرات البيئة (STRIPE_KEY) التي تم ضبطها في Vercel.
const stripe = Stripe(process.env.STRIPE_KEY); 
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // هذا أيضًا يُقرأ من Vercel Environment Variables

const router = express.Router();

// دالة مساعده لإنشاء الطلب في قاعدة البيانات
const createOrder = async (data) => {
    let productsFromMetadata = [];

    try {
        // جلب تفاصيل المنتجات (line items) من جلسة Stripe Checkout
        const sessionLineItems = await stripe.checkout.sessions.listLineItems(data.id, {
            expand: ['data.price.product'], // لتضمين بيانات المنتج التفصيلية
        });

        console.log('Stripe Line Items Response:', JSON.stringify(sessionLineItems, null, 2));

        // التحقق مما إذا كانت هناك أي منتجات (line items) في الجلسة
        if (!sessionLineItems || !Array.isArray(sessionLineItems.data) || sessionLineItems.data.length === 0) {
            console.error('No line items found for this session from Stripe.');
            return; // الخروج من الدالة إذا لم توجد منتجات
        }

        // معالجة المنتجات لتحويلها إلى تنسيق مناسب لحفظها في قاعدة البيانات
        productsFromMetadata = sessionLineItems.data.map(item => {
            if (!item.price) {
                console.warn(`Line item ${item.id} is missing a price object.`);
                return null;
            }

            const productData = item.price.product;

            if (!productData) {
                console.warn(`Product data is missing for line item: ${item.id} even after expansion. This might indicate an issue with product creation or linking in Stripe.`);
                return null;
            }

            // محاولة الحصول على الـ id من metadata أولاً، وإلا استخدام الـ id الخاص بـ Stripe
            const productId = productData.metadata && productData.metadata.id ? productData.metadata.id : productData.id;

            if (!productId) {
                console.warn(`Unable to determine a valid product ID for line item: ${item.id}.`);
                return null;
            }

            return {
                id: productId,
                name: productData.name,
                price: item.price.unit_amount / 100, // تحويل السعر من سنتات إلى دولارات
                image: productData.images && productData.images.length > 0 ? productData.images[0] : null,
                cartQuantity: item.quantity,
            };
        }).filter(item => item !== null); // تصفية أي منتجات لم يتم معالجتها بنجاح

        if (productsFromMetadata.length === 0) {
            console.error('No valid products found for order after processing Stripe line items.');
            return;
        }

    } catch (fetchParseError) {
        console.error('Error fetching or parsing line items from Stripe:', fetchParseError.message);
        return;
    }

    // حساب إجمالي الطلب
    const subtotalInDollars = data.amount_subtotal / 100;
    const totalInDollars = data.amount_total / 100;

    // الحصول على معرف المستخدم من بيانات الـ metadata
    const userId = data.metadata.userId;
    if (!userId) {
        console.error('Error: userId not found in session metadata for order creation.');
        return;
    }

    // إنشاء كائن طلب جديد
    const newOrder = new Order({
        userId: userId,
        customerId: data.customer,
        paymentIntentId: data.payment_intent,
        products: productsFromMetadata,
        subtotal: subtotalInDollars,
        total: totalInDollars,
        shipping: data.customer_details,
        delivery_status: 'pending', // حالة أولية
        payment_status: data.payment_status,
    });

    // حفظ الطلب في قاعدة البيانات
    try {
        const savedOrder = await newOrder.save();
        console.log('Processed Order successfully and saved to DB:', savedOrder);
    } catch (saveError) {
        console.error('Error saving order to database:', saveError);
    }
};

// مسار Webhook
router.post('/', express.raw({type: 'application/json'}), async (req, res) => {
    // تم التعليق على سطر التحقق من التوقيع مؤقتًا للتشخيص
    // const sig = req.headers['stripe-signature'];
    let event;

    try {
        // تم التعليق على سطر التحقق من التوقيع مؤقتًا للتشخيص
        // event = stripe.webhooks.constructEvent(
        //     req.body,
        //     sig,
        //     endpointSecret
        // );

        // **استخدم هذا بدلاً منه للتجربة فقط:**
        // قم بتحليل جسم الطلب الخام مباشرة إلى كائن JSON
        event = JSON.parse(req.body.toString());
        console.log('Webhook event received (SIGNATURE VERIFICATION SKIPPED FOR DIAGNOSIS).');

    } catch (err) {
        // إذا فشل الـ parse هنا، فهناك مشكلة في صيغة الـ body نفسه
        console.error(`Webhook Error during parsing (not signature): ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const data = event.data.object; // بيانات الكائن المتعلقة بالحدث
    const eventType = event.type;   // نوع الحدث

    // معالجة حدث اتمام الدفع
    if(eventType === 'checkout.session.completed'){
        try {
            console.log('Attempting to create order from checkout.session.completed event...');
            await createOrder(data);
            console.log('createOrder function finished and likely saved data.');
        } catch (err) {
            console.error('Error in createOrder function called from webhook:', err.message);
        }
    } else {
        console.log(`Unhandled event type: ${eventType}`); // تسجيل أي أنواع أحداث أخرى غير معالجة
    }

    // إرسال استجابة 200 OK لـ Stripe لتأكيد استلام الـ webhook
    res.status(200).end();
});

module.exports = router;