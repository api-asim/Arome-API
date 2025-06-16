const { User } = require('../models/user'); 
const jwt = require('jsonwebtoken');

// const login = async (req , res)=>{
//     try{
//         const {name , email , avatar , phoneNumber} = req.body;
//         let user
//         user = await User.findOne({email})
//         if(!user){
//             const newUser = new User({
//                 name , email , avatar , phoneNumber
//             })
//             await newUser.save();
//             user = newUser
//         }
//         user = user.toObject({getters: true})
//         const token = jwt.sign(user , process.env.JWT_SECRET_KEY)
//         res.cookie('access_token' , token , {
//             httpOnly:true
//         })
//         res.status(200).json({
//             success:true,
//             user
//         })
//     }catch(err){
//         res.status(500).json({
//             success:false,
//             error: err.message 
//         })
//     }
// }

const login = async (req , res)=>{
    try{
        const {name , email , avatar , phoneNumber} = req.body;
        let user
        user = await User.findOne({email})
        if(!user){
            const newUser = new User({
                name , email , avatar , phoneNumber
            })
            await newUser.save();
            user = newUser
        }
        user = user.toObject({getters: true})
        const token = jwt.sign(user , process.env.JWT_SECRET_KEY)

        res.cookie('access_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            // domain: '.vercel.app', 
        });
        res.status(200).json({
            success:true,
            user,
            token
        })
    }catch(err){
        res.status(500).json({
            success:false,
            error: err.message
        })
    }
}

const getUser = async (req , res)=>{
    try{
        const token = req.cookies.access_token
        if(!token){
            return res.status(403).json({
                success:false,
                message:'Unauthorized' 
            })
        }
        const user = jwt.verify(token , process.env.JWT_SECRET_KEY)
        res.status(200).json({
            success:true,
            user
        })
    }catch(err){
        res.status(500).json({
            success:false,
            error:err.message 
        })
    }
}

const logout = async (req, res) => {
    try {
      res.clearCookie('access_token', { httpOnly: true, path: '/' });
      res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
};


module.exports = {
    login,
    getUser,
    logout
};