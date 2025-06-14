const mongoose = require('mongoose');
const productSchema = new mongoose.Schema(
    {
        title:{type:String , required:true},
        type:{type:String , required:true},
        imageURL: {
            url: { type: String, required: true },
            public_id: { type: String, required: true },
        },
        cost:{type:Number, required:true},
        discount:{type:Number , required:true}
    },
    {
        timestamps:true, 
    }
);
const Product = mongoose.model('Product' , productSchema);

exports.Product = Product; 