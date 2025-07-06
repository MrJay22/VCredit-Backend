const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // ✅ not auth.something
const User = require('../models/User');

// GET /wallet
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      balance: user.walletBalance,
      transactions: [
        { id: 1, desc: 'Loan Disbursement', amount: 5000, date: '2024-06-15' },
        { id: 2, desc: 'Repayment', amount: -2000, date: '2024-06-20' },
        { id: 3, desc: 'Top-up', amount: 3000, date: '2024-06-22' }
      ]
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
