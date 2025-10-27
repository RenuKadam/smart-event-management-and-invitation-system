const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '90d'
    });
};

exports.signup = async (req, res) => {
    try {
        // Log incoming request data
        console.log('Registration request:', {
            name: req.body.name,
            email: req.body.email,
            role: req.body.role,
            hasPhoneNumber: !!req.body.phoneNumber,
            hasPassword: !!req.body.password
        });

        // Validate email
        if (!validator.isEmail(req.body.email)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide a valid email address'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: req.body.email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                status: 'fail',
                message: 'Email already in use'
            });
        }

        // Create new user
        const newUser = await User.create({
            name: req.body.name.trim(),
            email: req.body.email.toLowerCase().trim(),
            password: req.body.password,
            role: req.body.role === 'organizer' ? 'organizer' : 'participant',
            phoneNumber: req.body.phoneNumber.trim()
        });

        const token = signToken(newUser._id);

        res.status(201).json({
            status: 'success',
            token,
            data: {
                user: {
                    id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role
                }
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1) Check if email and password exist
        if (!email || !password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide email and password'
            });
        }

        // 2) Check if user exists && password is correct
        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.correctPassword(password))) {
            return res.status(401).json({
                status: 'fail',
                message: 'Incorrect email or password'
            });
        }

        // 3) If everything ok, send token to client
        const token = signToken(user._id);

        res.status(200).json({
            status: 'success',
            token,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        res.status(200).json({
            status: 'success',
            data: {
                user
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
}; 