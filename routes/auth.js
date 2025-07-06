const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');

// JWT Generator (Sequelize uses `id`, not `_id`)
const generateToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password)
      return res.status(400).json({ message: 'Name, phone, and password are required' });

    const exists = await User.findOne({ where: { phone } });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ name, phone, password });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ where: { phone } });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid PIN' });

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Login failed' });
  }
});

// CHANGE PASSWORD
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashed });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOAN FORM COMPLETION CHECK
router.get('/loan-status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isFormComplete = user.bvn && user.address && user.employmentStatus;

    res.json({
      hasCompletedForm: !!isFormComplete,
    });
  } catch (err) {
    console.error('Loan status error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
