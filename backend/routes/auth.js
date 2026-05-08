const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getUserModel, getAllUserModels } = require('../db');

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, phone, password, role, department } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Strict Role Constraints
        if (role === 'admin') {
            return res.status(403).json({ success: false, message: 'Admin account creation is restricted.' });
        }

        if (role === 'authority') {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(403).json({ success: false, message: 'Authority accounts can only be created by an Administrator.' });
            }
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.role !== 'admin') {
                    throw new Error('Unauthorized');
                }
            } catch (err) {
                return res.status(403).json({ success: false, message: 'Unauthorized: Only Admins can create Authority nodes.' });
            }
        }

        console.log(`Signup Attempt: ${normalizedEmail} (${role})`);

        const UserModel = getUserModel(role);
        if (!UserModel) {
            return res.status(400).json({ success: false, message: 'Invalid role specified.' });
        }

        // Check if user exists in ANY collection to avoid cross-role duplicates (optional but safer)
        const allModels = getAllUserModels();
        for (const model of allModels) {
            const exists = await model.findOne({ email: normalizedEmail });
            if (exists) {
                console.warn(`Signup Failed: Email already registered in ${model.modelName} - ${normalizedEmail}`);
                return res.status(400).json({ success: false, message: 'This email is already registered.' });
            }
        }

        const user = new UserModel({ name, email: normalizedEmail, phone, password, role, department });
        await user.save();
        console.log(`User created successfully in ${UserModel.modelName}: ${user._id}`);

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
        const { password: _, ...userData } = user.toObject();
        res.status(201).json({ success: true, token, user: userData });
    } catch (error) {
        console.error('Signup Error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body; // Role is optional but helpful
        const loginEmail = email.toLowerCase().trim();
        console.log(`Login Attempt: ${loginEmail} (Role hint: ${role || 'none'})`);

        let user = null;
        let UserModel = null;

        // Strategy: If role is provided, check that collection first/only.
        // If not, check all collections.

        if (role) {
            UserModel = getUserModel(role);
            if (UserModel) {
                user = await UserModel.findOne({ email: loginEmail });
            }
        } else {
            // Iterate all models to find user
            const allModels = getAllUserModels();
            for (const model of allModels) {
                user = await model.findOne({ email: loginEmail });
                if (user) {
                    UserModel = model;
                    break;
                }
            }
        }

        if (!user || !(await user.comparePassword(password))) {
            console.warn(`Login Failed: Invalid credentials for ${loginEmail}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Strict role matching if role was provided in request
        if (role && user.role !== role) {
            console.warn(`Role Mismatch: Found in ${user.role}, requested ${role}`);
            return res.status(403).json({
                success: false,
                message: `Portal Mismatch: You are registered as a ${user.role}. Please use the correct login.`
            });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
        const { password: _, ...userData } = user.toObject();

        console.log(`Login Success: ${loginEmail} as ${user.role}`);
        res.json({ success: true, token, user: userData });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

const auth = require('../middleware/auth');

// Get all users (Admin only)
router.get('/users', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const allUserModels = getAllUserModels();
        let allUsers = [];

        for (const model of allUserModels) {
            const users = await model.find({}, '-password');
            allUsers = [...allUsers, ...users];
        }

        res.json(allUsers);
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete user (Admin only)
router.delete('/users/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const allUserModels = getAllUserModels();
        let deleted = false;

        for (const model of allUserModels) {
            const result = await model.findByIdAndDelete(req.params.id);
            if (result) {
                deleted = true;
                break;
            }
        }

        if (deleted) {
            res.json({ success: true, message: 'User deleted successfully' });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Award points to citizen (Authority/Admin only)
router.patch('/users/:id/points', auth, async (req, res) => {
    try {
        if (req.user.role !== 'authority' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized: Only authorities can award points.' });
        }

        const { points } = req.body;
        if (![10, 25].includes(points)) {
            return res.status(400).json({ success: false, message: 'Invalid point allocation. Only 10 and 25 points are allowed.' });
        }

        const allUserModels = getAllUserModels();
        let targetUser = null;
        let UserModel = null;

        for (const model of allUserModels) {
            targetUser = await model.findById(req.params.id);
            if (targetUser) {
                UserModel = model;
                break;
            }
        }

        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'Citizen node not found.' });
        }

        if (targetUser.role !== 'citizen') {
            return res.status(400).json({ success: false, message: 'Registry Error: Points can only be awarded to citizen nodes.' });
        }

        targetUser.points = (targetUser.points || 0) + points;
        await targetUser.save();

        console.log(`Points awarded: +${points} to user ${targetUser.email}`);
        res.json({ success: true, message: `Successfully transmitted ${points} points.`, points: targetUser.points });
    } catch (error) {
        console.error('Point allocation error:', error);
        res.status(500).json({ success: false, message: 'Neural link interrupted: Server error.' });
    }
});

module.exports = router;
