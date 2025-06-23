const express = require('express')
const router = express.Router()


const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Waiter = require('../models/Waiter.js')

router.post('/register', async(req,res)=> {
    const {Username, Password} = req.body;

    try{
        
        if(!Username || !Password){
            res.status(400).json({error: "Please Fill All The Fields"})
        }

        const butler = await Waiter.create({Username, Password: bcrypt.hashSync(Password,10)})

        // Generate JWT token
        const token = jwt.sign({id: butler._id},process.env.JWT_SECRET, {
            expiresIn: '30d'})
   
        res.status(201).json({message: "Waiter Registered Successfully", token: token})
    } catch (error) {
        console.error(error)
        res.status(500).json({error: "Internal Server Error"})

    }
})

router.post('/login', async (req, res) => {
    const { Username, Password } = req.body;

    try {
        if (!Username || !Password) {
            return res.status(400).json({ error: "Please Fill All The Fields" });
        }

        // Find user by username only
        const waiter = await Waiter.findOne({ Username: Username });
        if (!waiter) {
            return res.status(404).json({ error: "Waiter Not Found" });
        }

        // Compare password
        const isPasswordValid = bcrypt.compareSync(Password, waiter.Password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid Password" });
        }

        const token = jwt.sign({ id: waiter._id }, process.env.JWT_SECRET, {
            expiresIn: '30d'
        });

        res.status(200).json({ message: "Waiter Logged In Successfully", token: token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post('/logout', (req, res) => {
    // Invalidate the token on the client side
    res.status(200).json({message: "Waiter Logged Out Successfully"})
})

module.exports = router;