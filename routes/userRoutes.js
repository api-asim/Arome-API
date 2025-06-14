const { User } = require('../models/user');
const moment = require('moment');
const bcrypt = require('bcrypt');


const router  = require('express').Router();

//Get USER
router.get('/:id' , async(req , res)=>{
    try{
        const response = await User.findById(req.params.id);
        return res.status(200).send({
            _id: response._id,
            FirstName: response.FirstName,
            LastName: response.LastName,
            UserName: response.UserName,
            email: response.email,
            // password: response.password,
            isAdmin: response.isAdmin,
        });
    }catch(err){
        res.status(500).send(err)
    }
})

//GET ALL USERS
router.get('/' , async(req , res)=>{
    try{
        const users = await User.find().sort({_id: -1});
        res.status(200).send(users);
    }
    catch(err){
        res.status(500).send(err)
    }
});

//Delete USER
router.delete('/:id' , async(req , res)=>{
    try{
        const deletedUsers = await User.findByIdAndDelete(req.params.id);
        res.status(200).send(deletedUsers);
    }
    catch(err){
        res.status(500).send(err)
    }
})

//UPDATE USER
router.put('/:id' , async(req , res)=>{
    try{
        const user = await User.findById(req.params.id);
        if(!(user.email === req.body.email)){
            const emailInUse = await User.findOne({email: req.body.email});
            if(emailInUse) 
                return res.status(400).send('That email is already in use...');
        }
        if(req.body.password && user){
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password , salt);
            user.password = hashedPassword;
        }
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            {
                FirstName: req.body.FirstName,
                LastName: req.body.LastName,
                UserName: req.body.UserName,
                email: req.body.email,
                isAdmin: req.body.isAdmin,
                password: user.password,
            },
            {new: true}
        );
        res.status(200).send({
            _id: updatedUser._id,
            FirstName: updatedUser.FirstName,
            LastName: updatedUser.LastName,
            UserName: updatedUser.UserName,
            email: updatedUser.email,
            isAdmin: updatedUser.isAdmin
        });
    }catch(err){
        res.status(500).send(err)
    }
});

//GET USER STATS
router.get('/find/stats'  ,  async(req , res)=>{
    const previousMonth = moment()
    .month(moment().month() - 1)
    .set('date' , 1)
    .format('YYYY-MM-DD HH:mm:ss');
    try{
        const users = await User.aggregate([
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
        res.status(200).send(users);
    }catch(err){
        console.log(err)
        res.status(500).send(err);
    }
});

// GET ALL USER STATS
router.get('/find/all-stats', async (req, res) => {
    try {
        const users = await User.aggregate([
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
        res.status(200).send(users);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});


module.exports = router


