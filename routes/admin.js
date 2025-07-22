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


router.get('/loans', adminAuth, async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    status = '',
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = req.query;

  const offset = (page - 1) * limit;
  const where = {};
  if (status) where.status = status;

  const userWhere = search
    ? {
        [db.Sequelize.Op.or]: [
          { name: { [db.Sequelize.Op.iLike]: `%${search}%` } },
          { phone: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        ],
      }
    : undefined;

  try {
    const { count, rows } = await db.LoanTransaction.findAndCountAll({
      where,
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: db.User,
          attributes: ['name', 'phone'],
          where: userWhere,
        },
      ],
    });

    res.json({ data: rows, total: count });
  } catch (err) {
    console.error('Admin Get Loan Transactions Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});





router.get('/loans/:id', adminAuth, async (req, res) => {
  try {
    const loan = await db.LoanTransaction.findByPk(req.params.id, {
      include: [{ model: db.User, attributes: ['name', 'phone'] }],
    });

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    res.json(loan);
  } catch (err) {
    console.error('Loan Fetch Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});




router.post('/loans/:id/approve', adminAuth, async (req, res) => {
  try {
    const loan = await db.LoanTransaction.findByPk(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    loan.status = 'running';
    await loan.save();

    res.json({ message: 'Loan approved' });
  } catch (err) {
    console.error('Loan Approval Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});




router.post('/loans/:id/decline', adminAuth, async (req, res) => {
  try {
    const loan = await db.LoanTransaction.findByPk(req.params.id);
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
