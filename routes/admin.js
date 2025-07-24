const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const db = require('../models'); // ✅ full Sequelize models object
const { User, Loan, LoanTransaction, Repayment, ManualPayment  } = db;
const { Op, fn, col, Sequelize } = require('sequelize');

// GET /api/admin/dashboard
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.count();

    // Users who have never completed the loan form
    const usersWithoutLoan = await User.count({
      where: {
        id: {
          [Op.notIn]: Sequelize.literal('(SELECT DISTINCT userId FROM Loans)')
        }
      }
    });

    const submittedForms = await Loan.count({ where: { status: 'pending' } });
    const pendingApprovals = await Loan.count({ where: { status: 'pending' } });

    const activeLoans = await LoanTransaction.count({ where: { status: 'running' } });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyRevenue = await Repayment.sum('amount', {
      where: {
        createdAt: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      }
    });

    const approvedLoans = await Loan.count({ where: { status: 'approved' } });
    const totalLoans = await Loan.count();

    const overdueLoans = await LoanTransaction.count({
      where: {
        status: 'running',
        dueDate: { [Op.lt]: new Date() }
      }
    });

    const approvalRate = totalLoans > 0 ? ((approvedLoans / totalLoans) * 100).toFixed(1) : '0.0';
    const overdueRate = activeLoans > 0 ? ((overdueLoans / activeLoans) * 100).toFixed(1) : '0.0';

    const topDebtors = await LoanTransaction.findAll({
      where: { status: 'running' },
      include: [{ model: User, attributes: ['name', 'phone'] }],
      order: [['amount', 'DESC']],
      limit: 5
    });

    const monthlyRaw = await Repayment.findAll({
      attributes: [
        [fn('MONTHNAME', col('createdAt')), 'month'],
        [fn('SUM', col('amount')), 'total']
      ],
      group: [fn('MONTH', col('createdAt'))],
      order: [[fn('MONTH', col('createdAt')), 'ASC']],
      limit: 6
    });

    const monthlyLabels = monthlyRaw.map(item => item.get('month'));
    const monthlyRevenueData = monthlyRaw.map(item => Number(item.get('total')));

    const recentRepayments = await Repayment.findAll({
      include: [{ model: User }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.json({
      stats: {
        totalUsers,
        usersWithoutLoan,
        submittedForms,
        activeLoans,
        pendingApprovals,
        monthlyRevenue: monthlyRevenue || 0,
        approvalRate,
        overdueRate,
        topDebtors,
        monthlyLabels,
        monthlyRevenueData
      },
      recentRepayments
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


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
        occupation: loanProfile.occupation,
        bankName: loanProfile.bankName,
        accountNumber: loanProfile.accountNumber,
        accountName: loanProfile.accountName,
        dob: loanProfile.dob,
        guarantor1Name: loanProfile.guarantor1Name,
        guarantor1Phone: loanProfile.guarantor1Phone,
        guarantor1Relationship: loanProfile.guarantor1Relationship,
        guarantor2Name: loanProfile.guarantor2Name,
        guarantor2Phone: loanProfile.guarantor2Phone,
        guarantor2Relationship: loanProfile.guarantor2Relationship,
        emergencyContactName: loanProfile.emergencyContactName,
        emergencyContactName: loanProfile.emergencyContactName,
        emergencyContactPhone: loanProfile.emergencyContactPhone,
        emergencyContactRelationship: loanProfile.emergencyContactRelationship,
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

// Approve loan/user
router.put('/users/:id/approve', adminAuth, async (req, res) => {
  try {
    const user = await Loan.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.status = 'approved';
    await user.save();

    res.json({ message: 'User approved', loan: user });
  } catch (err) {
    console.error('[APPROVE ERROR]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Decline loan/user
router.put('/users/:id/decline', adminAuth, async (req, res) => {
  try {
    const user = await Loan.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Loan not found' });

    user.status = 'declined';
    await user.save();

    res.json({ message: 'User declined', loan: user });
  } catch (err) {
    console.error('[DECLINE ERROR]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/users/:id/eligible-amount
router.patch('/users/:id/eligible-amount', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { eligibleAmount } = req.body;

  try {
    const loanUser = await User.findByPk(id);
    if (!loanUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    loanUser.eligibleAmount = eligibleAmount;
    await loanUser.save();

    res.json({ message: 'Eligible amount updated', user: loanUser });
  } catch (err) {
    console.error('Error updating eligible amount:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Inside routes/admin.js
router.put('/users/:id/edit', adminAuth, async (req, res) => {
  const { eligibleAmount } = req.body;

  if (eligibleAmount == null)
    return res.status(400).json({ message: 'Eligible amount is required.' });

  try {
    const user = await User.findByPk(req.params.id); // User model stores eligibleAmount
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.eligibleAmount = eligibleAmount;
    await user.save();

    res.json({ message: 'Eligible amount updated successfully.', user });
  } catch (err) {
    console.error('Update failed:', err);
    res.status(500).json({ message: 'Server error' });
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
          { name: { [db.Sequelize.Op.like]: `%${search}%` } },
          { phone: { [db.Sequelize.Op.like]: `%${search}%` } },
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

// Mark a loan as cleared
router.post('/loans/:id/clear', adminAuth, async (req, res) => {
  const loanId = req.params.id;

  try {
    const loan = await db.LoanTransaction.findByPk(loanId);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.status === 'cleared') {
      return res.status(400).json({ error: 'Loan already cleared' });
    }

    loan.status = 'cleared';
    loan.balance = 0;
    loan.clearedAt = new Date();

    await loan.save();

    res.json({ message: 'Loan marked as cleared', loan });
  } catch (err) {
    console.error('Admin Clear Loan Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// routes/admin/repayment.js
router.get('/repayments', adminAuth, async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = '', // optional: search by user name or phone
  } = req.query;

  const offset = (page - 1) * limit;

  const userWhere = search
    ? {
        [db.Sequelize.Op.or]: [
          { name: { [db.Sequelize.Op.like]: `%${search}%` } },
          { phone: { [db.Sequelize.Op.like]: `%${search}%` } },
        ],
      }
    : undefined;

  try {
    const { count, rows } = await db.Repayment.findAndCountAll({
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
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
    console.error('Admin Repayment History Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/manual-payments
router.get('/manual-repayments', adminAuth, async (req, res) => {
  const { page = 1, limit = 20, search = '', status = '' } = req.query;
  const offset = (page - 1) * limit;

  const where = {};
  if (status) where.status = status;

  const userWhere = search
    ? {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ],
      }
    : undefined;

  try {
    const { count, rows } = await ManualPayment.findAndCountAll({
      where,
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['name', 'phone'],
          where: userWhere,
          required: !!userWhere,
        },
      ],
    });

    res.json({ data: rows, total: count });
  } catch (err) {
    console.error('Admin Manual Payments Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Approve Manual Payment
router.post('/manual-repayments/:id/approve', adminAuth, async (req, res) => {
  try {
    const manualPayment = await db.ManualPayment.findByPk(req.params.id);
    if (!manualPayment) return res.status(404).json({ error: 'Manual payment not found' });

    if (manualPayment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment is already processed' });
    }

    // Optional: update related loan balance here if needed

    manualPayment.status = 'approved';
    manualPayment.updatedAt = new Date();
    await manualPayment.save();

    res.json({ message: 'Manual payment approved', data: manualPayment });
  } catch (err) {
    console.error('Approve Manual Payment Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject Manual Payment
router.post('/manual-repayments/:id/reject', adminAuth, async (req, res) => {
  try {
    const manualPayment = await db.ManualPayment.findByPk(req.params.id);
    if (!manualPayment) return res.status(404).json({ error: 'Manual payment not found' });

    if (manualPayment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment is already processed' });
    }

    manualPayment.status = 'rejected';
    manualPayment.updatedAt = new Date();
    await manualPayment.save();

    res.json({ message: 'Manual payment rejected', data: manualPayment });
  } catch (err) {
    console.error('Reject Manual Payment Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
