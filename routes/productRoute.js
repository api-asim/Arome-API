const express = require('express');
const cloudinary = require('../utils/cloudinary');
const { Product } = require('../models/products');
const router = express.Router();
const multer = require('multer');


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


//CREATE NEW PRODUCT
router.post('/', async (req, res) => {
    const { title, type, imageURL, cost, discount } = req.body; 
    try {
        if (imageURL) {
            const uploadRes = await cloudinary.uploader.upload(imageURL, {
                upload_preset: "Arome perfume shop"
            });
            if (uploadRes) {
                const product = new Product({
                    title,
                    type, 
                    cost,
                    discount,
                    
                    imageURL: {
                        url: uploadRes.secure_url, 
                        public_id: uploadRes.public_id,
                    }
                });
                const savedProduct = await product.save();
                res.status(200).send(savedProduct);
            }
        } else {
            return res.status(400).send("Image URL is required.");
        }
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).send({ message: "Failed to create product", error: error.message }); 
    }
});

//GET ALL PRODUCTS
router.get('/' , async(req , res)=>{
    try{
        const products = await Product.find();
        res.status(200).send(products)
    }
    catch(error){
        console.error(error);
        res.status(500).send(error);
    }
})


//GET PRODUCT
router.get('/find/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.status(200).send(product);
    } catch (err) {
        console.error("Server Error:", err);
        res.status(500).send(err);
    }
});

//DELETE PRODUCT
router.delete('/:id' , async(req , res)=>{
    try{
        const product = await Product.findById(req.params.id);
        if(!product) return res.status(404).send('Product not found...');
        if(product.imageURL.public_id){
            const destroyResponse = await cloudinary.uploader.destroy(
                product.imageURL.public_id
            );
            if(destroyResponse){
                const deletedProduct = await Product.findByIdAndDelete(req.params.id);
                res.status(200).send(deletedProduct);
            }
        }
        else{
            console.log('Action terminated. Failed to deleted product image...')
        }
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})


//EDIT PRODUCT
router.put('/find/:id', upload.single('image'), async (req, res) => {
    try {
        console.log('PUT /api/product/find/:id received.');
        console.log('req.params.id:', req.params.id);
        console.log('req.body:', req.body);
        console.log('req.file:', req.file);

        const productId = req.params.id;
        const { title, type, cost, discount, imageUrlToDestroy, imageURL } = req.body;

        let updatedImage = {};

        if (req.file) {
            console.log('New image file detected. Uploading to Cloudinary...');
            const uploadRes = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({
                    upload_preset: "Arome perfume shop" 
                }, (error, result) => {
                    if (error) {
                        console.error("Cloudinary upload_stream error:", error);
                        return reject(error);
                    }
                    resolve(result);
                }).end(req.file.buffer);
            });

            updatedImage = {
                url: uploadRes.secure_url,
                public_id: uploadRes.public_id,
            };
            if (imageUrlToDestroy) {
                console.log('Old image public_id received. Destroying old image from Cloudinary...');
                await cloudinary.uploader.destroy(imageUrlToDestroy);
            }
        } else if (imageURL) {
            console.log('No new image file. Using existing imageURL from request body.');
            try {
                updatedImage = JSON.parse(imageURL);
                if (!updatedImage.url || !updatedImage.public_id) {
                    throw new Error("Invalid structure for existing imageURL.");
                }
            } catch (parseError) {
                console.error("Error parsing or validating imageURL from request body:", parseError);
                return res.status(400).send({ message: "Invalid imageURL format or structure in request body. Expected {url: '...', public_id: '...'}" });
            }
        } else {
            console.log('No image data provided for update.');
            return res.status(400).send({ message: "Image data is required for product update." });
        }
        const productUpdateFields = {
            title,
            type,
            cost: Number(cost),
            discount: Number(discount),
            imageURL: updatedImage, 
        };
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: productUpdateFields },
            { new: true, runValidators: true } 
        );
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        res.status(200).json(updatedProduct);

    } catch (err) {
        console.error("Error during product update (PUT):", err);
        res.status(500).json({ message: "Failed to update product.", error: err.message });
    }
});

module.exports = router;