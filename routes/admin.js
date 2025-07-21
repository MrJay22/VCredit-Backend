const express = require('express');
const router = express.Router();
const db = require('../models');
const { Op } = require('sequelize');
const adminAuth = require('../middleware/adminAuth');

// GET /admin/users (List users with filters and form status)
router.get('/users', adminAuth, async (req, res) => {
  const { page = 1, limit = 50, search = '', role = '' } = req.query;
  const offset = (page - 1) * limit;

  const where = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
  }

  try {
    const { count, rows } = await db.User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    // Enrich users with loan form status
    const enrichedUsers = await Promise.all(rows.map(async (user) => {
      const loan = await db.Loan.findOne({ where: { userId: user.id } });
      return {
        ...user.toJSON(),
        formStatus: loan ? loan.status : 'not_submitted',
      };
    }));

    res.json({ data: enrichedUsers, total: count });
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
        phone: loanProfile.phone,
        address: loanProfile.address,
        bvn: loanProfile.bvn,
        status: loanProfile.status,
        photo: loanProfile.photo,
        idImage: loanProfile.idImage,
        verified: true,
      });

    }

    const user = await db.User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      verified: false,
      note: 'User has not completed loan application',
    });


  } catch (err) {
    console.error('Admin Get User Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/loans', adminAuth, async (req, res) => {
  const { page = 1, limit = 50, search = '', status = '' } = req.query;
  const offset = (page - 1) * limit;

  const where = {};
  if (search) {
    where.name = { [db.Sequelize.Op.like]: `%${search}%` };
  }
  if (status) {
    where.status = status;
  }

  try {
    const { count, rows } = await db.Loan.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [{ model: db.User, attributes: ['email'] }],
    });

    res.json({ data: rows, total: count });
  } catch (err) {
    console.error('Admin Get Loans Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/loans/:id', adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const loan = await db.Loan.findByPk(id, {
      include: [{ model: db.User, attributes: ['email'] }],
    });

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    res.json(loan);
  } catch (err) {
    console.error('Admin Get Loan Detail Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/loans/:id/approve', adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const loan = await db.Loan.findByPk(id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    loan.status = 'approved';
    await loan.save();

    res.json({ message: 'Loan approved' });
  } catch (err) {
    console.error('Loan Approval Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/loans/:id/decline', adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const loan = await db.Loan.findByPk(id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    loan.status = 'declined';
    await loan.save();

    res.json({ message: 'Loan declined' });
  } catch (err) {
    console.error('Loan Decline Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
