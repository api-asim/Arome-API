const express = require('express');
const { Order } = require("../models/order.js");
const moment = require('moment');
const { query } = require('express'); 
const router = express.Router();


//Get All orders
router.get('/', async (req, res) => {
    try {
        let query = Order.find();
        if (req.query.new === 'true') {
            query = query.sort({ createdAt: -1 }).limit(5);
        } else {
            query = query.sort({ createdAt: -1 });
        }
        const orders = await query.exec(); 
        res.status(200).send(orders);
    } catch (error) {
        console.error("Error fetching orders:", error.message);
        res.status(500).json({ message: "Failed to fetch orders.", error: error.message });
    }
});


//UPDATE ORDER
router.put('/:id' , async(req , res)=>{ 
    try{
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            {$set: req.body}, 
            {new: true},
        );
        res.status(200).send(updatedOrder);
    }catch(err){
        res.status(500).send(err)
    }
});


//GET USER ORDERS
router.get("/find/:id" , async (req, res) => {
    try {
      const orders = await Order.findById(req.params.id);
      res.status(200).send(orders);
    } catch (err) {
      res.status(500).send(err);
    }
});

//GET ORDER STATS
router.get('/stats' ,  async(req , res)=>{
    const previousMonth = moment()
    .month(moment().month() - 1)
    .set('date' , 1)
    .format('YYYY-MM-DD HH:mm:ss');
    try{
        const orders = await Order.aggregate([
            {
                $match: {createdAt: {$gte : new Date(previousMonth)}},
            },
            {
                $project: {
                    month: {$month: '$createdAt'},
                },
            },
            {
                $group: {
                    _id: '$month',
                    total: {$sum: 1},
                },
            },
        ]);
        res.status(200).send(orders);
    }catch(err){
        console.log(err)
        res.status(500).send(err);
    }
});

// GET ALL ORDER STATS
router.get('/all-stats', async (req, res) => {
    try {
        const orders = await Order.aggregate([
            {
                $project: {
                    month: { $month: '$createdAt' },
                },
            },
            {
                $group: {
                    _id: '$month',
                    total: { $sum: 1 },
                },
            },
        ]);
        res.status(200).send(orders);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});


//GET Earning STATS
router.get('/earn/stats' ,  async(req , res)=>{
    const previousMonth = moment()
    .month(moment().month() - 1)
    .set('date' , 1)
    .format('YYYY-MM-DD HH:mm:ss');
    try{
        const earn = await Order.aggregate([
            {
                $match: {createdAt: {$gte : new Date(previousMonth)}},
            },
            {
                $project: {
                    month: {$month: '$createdAt'},
                    sales:'$total',
                },
            },
            {
                $group: {
                    _id: '$month',
                    total: {$sum: '$sales'},
                },
            },
        ]);
        res.status(200).send(earn);
    }catch(err){
        console.log(err)
        res.status(500).send(err);
    }
});



// GET ALL EARNING STATS
router.get('/all-earn/stats', async (req, res) => {
    try {
        const earn = await Order.aggregate([
            {
                $project: {
                    month: { $month: '$createdAt' },
                    sales: '$total',
                },
            },
            {
                $group: {
                    _id: '$month',
                    total: { $sum: '$sales' },
                },
            },
        ]);
        res.status(200).send(earn);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});


//GET 1 Week Sales
router.get('/week-sales' ,  async(req , res)=>{
    const lastWeek = moment()
    .day(moment().day() - 7)
    .format('YYYY-MM-DD HH:mm:ss');
    try{
        const income = await Order.aggregate([
            {
                $match: {createdAt: {$gte : new Date(lastWeek)}},
            },
            {
                $project: {
                    day: {$dayOfWeek: '$createdAt'},
                    sales:'$total',
                },
            },
            {
                $group: {
                    _id: '$day',
                    total: {$sum: '$sales'},
                },
            },
        ]);
        res.status(200).send(income);
    }catch(err){
        console.log(err)
        res.status(500).send(err);
    }
});



router.get('/all-time-monthly-sales', async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const monthlyEarn = await Order.aggregate([
            {
                
                $match: {
                    createdAt: {
                        $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
                        $lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`) 
                    }
                }
            },
            {
                $project: {
                    month: { $month: '$createdAt' }, 
                    sales: '$total', 
                },
            },
            {
                $group: {
                    _id: '$month',
                    total: { $sum: '$sales' },
                },
            },
            {
               
                $sort: { _id: 1 }
            }
        ]);

        res.status(200).send(monthlyEarn);
    } catch (err) {
        console.error("Error fetching monthly earnings for current year:", err);
        res.status(500).send({ message: "Failed to fetch monthly earnings", error: err.message });
    }
});

module.exports = router;