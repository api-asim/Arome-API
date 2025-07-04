const bcrypt = require('bcrypt');
const Joi = require('joi');
const express = require('express');
const {User} = require('../models/user');
const genAuthToken = require('../utils/genAuthToken');

const router = express.Router();

router.post('/' , async(req , res)=>{
    const schema = Joi.object({
        FirstName: Joi.string().min(3).max(30).required(),
        LastName: Joi.string().min(3).max(30).required(),
        name: Joi.string().min(3).max(30).required(),
        email:Joi.string().min(3).max(200).required().email(),
        password:Joi.string().min(6).max(200).required(),
        isAdmin:Joi.boolean(),
    });
    const {error} = schema.validate(req.body);
    if(error) return res.status(400).send(error.details[0].message);
    let user = await User.findOne({email: req.body.email});
    if(user) return res.status(400).send('An error occurred during sign up. Please try again.....');
    user = new User({
        FirstName:req.body.FirstName,
        LastName:req.body.LastName,
        name:req.body.name,
        email:req.body.email,
        password:req.body.password,
        isAdmin:req.body.isAdmin,
    })
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password , salt);
    user =  await user.save()    
    const token = genAuthToken(user);
    res.send(token)
});
module.exports = router;