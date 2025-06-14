const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
    FirstName:{type: String , required:false},
    LastName:{type: String , required:false},
    name:{type: String , required:false},
    email:{
        type: String,
        required: false,
    },
    password:{
        type: String,
        required: false,
    },
    isAdmin:{type: Boolean, default:false },
    },
    {timestamps: true}
);
const User = mongoose.model('User' , userSchema);
exports.User = User