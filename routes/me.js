const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { User } = require('../models'); // Make sure this imports from Sequelize

// GET /me - Secure and clean
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] } // removes password from result
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email || '',
      eligibleAmount: user.eligibleAmount || 0,
      avatar: user.avatar || '',
      rank: user.rank || 'Basic',
      walletBalance: user.walletBalance || 0,
    });
  } catch (err) {
    console.error('GET /me error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /notifications - Update notification preference
router.put('/notifications', authMiddleware, async (req, res) => {
  try {
    const { notificationsEnabled } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.notificationsEnabled = notificationsEnabled;
    await user.save();

    res.json({ message: 'Notification preference updated' });
  } catch (err) {
    console.error('Notification update error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
