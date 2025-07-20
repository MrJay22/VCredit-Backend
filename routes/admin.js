const express = require('express');
const router = express.Router();
const db = require('../models');
const { Op } = require('sequelize');
const adminAuth = require('../middleware/adminAuth');

// 1. GET /admin/users (List users with filters)
router.get('/users', adminAuth, async (req, res) => {
  const { page = 1, limit = 50, search = '', role = '' } = req.query;
  const offset = (page - 1) * limit;

  const where = {};
  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }
  if (role) {
    where.role = role;
  }

  try {
    const { count, rows } = await db.User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({ data: rows, total: count });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. GET /admin/users/:id (Fetch full profile)
router.get('/users/:id', adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const loanProfile = await db.Loan.findOne({ where: { userId: id } });

    if (loanProfile) {
      return res.json({
        id: loanProfile.userId,
        name: loanProfile.name,
        email: loanProfile.email,
        phone: loanProfile.phone,
        address: loanProfile.address,
        bvn: loanProfile.bvn,
        nin: loanProfile.nin,
        verified: true,
      });
    }

    const user = await db.User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      verified: false,
      note: 'User has not completed loan application',
    });

  } catch (err) {
    console.error('Admin Get User Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
