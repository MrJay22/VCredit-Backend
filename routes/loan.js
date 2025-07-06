// routes/loan.js (Fully Converted to Sequelize)

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const shortid = require('shortid');
const { calculateOverdue } = require('../utils/loanUtils');
const { Op } = require('sequelize');

const db = require('../models');


// Apply
router.post('/apply', authMiddleware, async (req, res) => {
  try {
    const { personalDetails, guarantor1, guarantor2, photo } = req.body;
    const userId = req.user.id;

    if (!personalDetails || !guarantor1 || !guarantor2 || !photo) {
      return res.status(400).json({ message: 'Incomplete application data' });
    }

    const existing = await db.Loan.findOne({ where: { userId } });
    if (existing) {
      return res.status(400).json({ message: 'Application already submitted' });
    }

    // Flatten data
    const loanData = {
      userId,
      name: personalDetails.name,
      phone: personalDetails.phone,
      nin: personalDetails.nin,      
      bankName: personalDetails.bankName,
      accountNumber: personalDetails.accountNumber,
      accountName: personalDetails.accountName,
      dob: personalDetails.dob,
      address: personalDetails.address,

      guarantor1Name: guarantor1.name,
      guarantor1Phone: guarantor1.phone,
      guarantor1Relationship: guarantor1.relationship,

      guarantor2Name: guarantor2.name,
      guarantor2Phone: guarantor2.phone,
      guarantor2Relationship: guarantor2.relationship,

      photo: photo, // already base64 or URI
    };

    await db.Loan.create(loanData);
    await db.User.update({ hasApplied: true }, { where: { id: userId } });

    res.status(201).json({ message: 'Loan application submitted successfully' });
  } catch (err) {
    console.error('Loan Apply Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Initiate

router.post('/initiate', authMiddleware, async (req, res) => {
  try {
    const { amount, dueDate, days } = req.body;
    const userId = req.user.id;

    if (!amount || !dueDate || !days) {
      return res.status(400).json({ message: 'Missing amount, days or due date' });
    }

    // Check for existing running loan
    const existingLoan = await db.LoanTransaction.findOne({
      where: {
        userId,
        status: {
          [Op.in]: ['active', 'pending', 'running', 'overdue']
        }
      }
    });

    if (existingLoan) {
      return res.status(400).json({ message: 'You already have a loan in progress' });
    }

    const settings = await db.AdminSettings.findOne();
    if (!settings) {
      return res.status(500).json({ message: 'Loan settings not found' });
    }

    // Parse loanTerms safely
    let terms = [];
    if (typeof settings.loanTerms === 'string') {
      try {
        terms = JSON.parse(settings.loanTerms);
      } catch (err) {
        console.error('Failed to parse loanTerms JSON:', err);
        return res.status(500).json({ message: 'Invalid loan terms format in settings' });
      }
    } else if (Array.isArray(settings.loanTerms)) {
      terms = settings.loanTerms;
    }

    const selectedTerm = terms.find(t => t.days == days);
    if (!selectedTerm) {
      return res.status(400).json({ message: 'Invalid loan term selected' });
    }

    // Calculate interest
    const interest =
      selectedTerm.interestType === 'percent'
        ? Math.floor((amount * selectedTerm.interestValue) / 100)
        : Number(selectedTerm.interestValue);

    const totalRepayment = amount + interest;

    const loan = await db.LoanTransaction.create({
      userId,
      loanId: `LN-${shortid.generate().toUpperCase()}`,
      amount,
      interest,
      totalRepayment,
      balance: totalRepayment,
      dueDate,
      dateInitiated: new Date(),
      overdueInterest: 0,
      overdueDays: 0,
      status: 'pending',
      termDays: days
    });

    res.status(201).json({ message: 'Loan initiated and pending approval', loan });

  } catch (err) {
    console.error('Loan Initiation Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Loan status
router.get('/loan-status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ Step 1: Check if user has completed form using `Loan` model
    const formRecord = await db.Loan.findOne({ where: { userId } });
    if (!formRecord) return res.json({ hasCompletedForm: false });

    // ✅ Step 2: Get most recent loan transaction
    const loan = await db.LoanTransaction.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    // If no loan yet, return only form info
    if (!loan) return res.json({ hasCompletedForm: true, status: 'none' });

    // ✅ Step 3: Auto-debit overdue loan if needed
    const user = await db.User.findByPk(userId);
    const isOverdue = loan.status === 'running' && new Date(loan.dueDate) < new Date();

    if (isOverdue && user.walletBalance > 0 && loan.balance > 0) {
      const toPay = Math.min(user.walletBalance, loan.balance);

      await user.update({ walletBalance: user.walletBalance - toPay });

      const newBalance = loan.balance - toPay;
      const loanUpdate = {
        balance: newBalance,
        ...(newBalance === 0 ? { status: 'cleared', clearedAt: new Date() } : {})
      };
      await loan.update(loanUpdate);

      await db.Repayment.create({
        userId,
        loanId: loan.id,
        amount: toPay,
        method: 'auto-debit',
        status: 'success',
        createdAt: new Date(),
      });
    }

    // ✅ Step 4: Return status and loan details
    return res.json({
      hasCompletedForm: true,
      status: loan.status,
      loan: {
        loanId: loan.loanId,
        amount: loan.amount,
        interest: loan.interest,
        totalRepayment: loan.totalRepayment,
        balance: loan.balance,
        dueDate: loan.dueDate,
        declineReason: loan.declineReason,
      }
    });
  } catch (err) {
    console.error('Loan status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Loan settings
// routes/loan.js
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    const settings = await db.AdminSettings.findOne();

    let parsedTerms = [];

    // ✅ Parse loanTerms if it's a string
    if (typeof settings.loanTerms === 'string') {
      try {
        parsedTerms = JSON.parse(settings.loanTerms);
      } catch (e) {
        console.error('Failed to parse loanTerms JSON:', e);
      }
    } else if (Array.isArray(settings.loanTerms)) {
      parsedTerms = settings.loanTerms;
    }

    res.json({
      eligibleAmount: user.eligibleAmount || settings.eligibleAmount || 5000,
      minAmount: settings.minAmount || 1000,
      notice: settings.notice,
      overdueCharge: {
        type: settings.overdueType,
        value: settings.overdueValue,
      },
      repaymentTerms: parsedTerms, // ✅ Send as clean array
    });
  } catch (err) {
    console.error('Loan settings fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});




// Loan details
router.get('/details', authMiddleware, async (req, res) => {
  try {
    const loan = await db.LoanTransaction.findOne({
      where: { userId: req.user.id },
      order: [['dateInitiated', 'DESC']]
    });

    if (!loan) return res.status(404).json({ message: 'No loan found' });
    res.status(200).json({ loan });
  } catch (err) {
    console.error('Loan details fetch error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Repayment Info
router.get('/repayment-info', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const loan = await db.LoanTransaction.findOne({
      where: {
        userId,
        status: ['pending', 'running', 'overdue', 'cleared', 'declined']
      },
      order: [['dateInitiated', 'DESC']]
    });

    const repayments = await db.Repayment.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    if (!loan) return res.json({ loan: null, repayments: [] });

    // Fetch admin settings (fallback to default if none)
    const adminConfig = await db.AdminSettings.findOne();
    const overdueSetting = adminConfig?.overdue || { type: 'percent', value: 10 };

    // Calculate overdue details
    const { overdueDays, overdueInterest } = calculateOverdue(loan, overdueSetting);

    // Sum repayments for this loan only
    const totalPaid = repayments
      .filter(r => String(r.loanId) === String(loan.id))
      .reduce((sum, r) => sum + r.amount, 0);

    const balance = (loan.totalRepayment + overdueInterest) - totalPaid;

    // Update loan if needed
    const updates = {
      overdueDays,
      overdueInterest,
      balance,
      ...(overdueDays > 0 && loan.status === 'running' ? { status: 'overdue' } : {})
    };
    await loan.update(updates);

    const loanData = {
      id: loan.id,                 // SQL numeric ID
      loanId: loan.loanId,         // short code e.g. LN1234
      status: loan.status,
      amount: loan.amount,
      interest: loan.interest,
      dueDate: loan.dueDate,
      totalRepayment: loan.totalRepayment,
      overdueDays,
      overdueInterest,
      balance,
      clearedAt: loan.clearedAt || null
    };

    res.json({ loan: loanData, repayments });
  } catch (err) {
    console.error('Fetch Loan Info Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Repay
router.post('/repay', authMiddleware, async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;

  const t = await db.sequelize.transaction();
  try {
    const user = await db.User.findByPk(userId, { transaction: t });
    const loan = await db.LoanTransaction.findOne({
      where: { userId, status: 'running' },
      transaction: t
    });

    if (!loan) throw new Error('No active loan');
    if (amount > loan.balance) throw new Error('Repayment exceeds loan balance');
    if (amount > user.walletBalance) throw new Error('Insufficient wallet balance');

    await user.update({ walletBalance: user.walletBalance - amount }, { transaction: t });
    const newBalance = loan.balance - amount;

    await loan.update({
      balance: newBalance,
      ...(newBalance === 0 ? { status: 'cleared', clearedAt: new Date() } : {})
    }, { transaction: t });

    await db.Repayment.create({
      userId,
      loanId: loan.id,
      amount,
      method: 'manual',
      status: 'success',
      createdAt: new Date()
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Repayment successful', newLoanBalance: newBalance });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Repayment history
router.get('/repayment-history', authMiddleware, async (req, res) => {
  try {
    const repayments = await db.Repayment.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json({ history: repayments });
  } catch (err) {
    console.error('Repayment history error:', err);
    res.status(500).json({ error: 'Could not fetch repayment history' });
  }
});

// Repayment detail
router.get('/repayment/:id', authMiddleware, async (req, res) => {
  try {
    const repayment = await db.Repayment.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!repayment) return res.status(404).json({ error: 'Repayment not found' });
    res.json({ repayment });
  } catch (err) {
    console.error('Repayment detail error:', err);
    res.status(500).json({ error: 'Could not fetch repayment detail' });
  }
});

// Manual repayment
// routes/loan.js
router.post('/manual-repay', authMiddleware, async (req, res) => {
  try {
    const { amount, senderName, note, loanId, loanShortId } = req.body;
    const userId = req.user.id;

    if (!amount || !senderName || !note || !loanId || !loanShortId) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    await db.ManualPayment.create({
      userId,
      loanId,
      senderName,
      amount,
      note,
      status: 'pending'
    });

    await db.Repayment.create({
      userId,
      loanId,
      amount,
      method: 'manual',
      status: 'pending',
      createdAt: new Date()
    });

    res.status(201).json({ message: `Payment for ${loanShortId} submitted and pending review` });
  } catch (err) {
    console.error('Manual payment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Preview loan

router.post('/preview', authMiddleware, async (req, res) => {
  try {
    const { amount, days } = req.body;

    if (!amount || !days) {
      return res.status(400).json({ message: 'Amount and days are required' });
    }

    const settings = await db.AdminSettings.findOne();
    if (!settings) {
      return res.status(500).json({ message: 'Admin settings not configured' });
    }

    // ✅ Ensure loanTerms is parsed
    let terms = [];
    if (typeof settings.loanTerms === 'string') {
      try {
        terms = JSON.parse(settings.loanTerms);
      } catch (err) {
        console.error('Failed to parse loanTerms:', err);
        return res.status(500).json({ message: 'Invalid loan term configuration' });
      }
    } else if (Array.isArray(settings.loanTerms)) {
      terms = settings.loanTerms;
    }

    // ✅ Match term by exact number
    const term = terms.find(t => Number(t.days) === Number(days));
    if (!term) {
      return res.status(400).json({ message: 'Invalid loan term selected' });
    }

    const interest = term.interestType === 'percent'
      ? Math.floor(amount * (term.interestValue / 100))
      : Number(term.interestValue);

    const totalRepayment = amount + interest;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(days));

    const overdueCharge = settings.overdueType === 'percent'
      ? `${settings.overdueValue}%`
      : `₦${Number(settings.overdueValue).toLocaleString()}`;

    return res.json({
      interest,
      totalRepayment,
      dueDate: dueDate.toDateString(),
      overdueCharge
    });

  } catch (err) {
    console.error('Loan preview error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});



// Approve
router.post('/approve/:id', adminAuth, async (req, res) => {
  try {
    const loan = await db.LoanTransaction.findByPk(req.params.id);
    if (!loan || loan.status !== 'pending') {
      return res.status(404).json({ message: 'Loan not found or already processed' });
    }
    await loan.update({ status: 'active' });
    res.json({ message: 'Loan approved successfully', loan });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Decline
router.post('/decline/:id', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const loan = await db.LoanTransaction.findByPk(req.params.id);
    if (!loan || loan.status !== 'pending') {
      return res.status(404).json({ message: 'Loan not found or already processed' });
    }
    await loan.update({ status: 'declined', declineReason: reason || 'No reason provided' });
    res.json({ message: 'Loan declined successfully', loan });
  } catch (err) {
    console.error('Decline error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/account', authMiddleware, async (req, res) => {
  try {
    const settings = await db.AdminSettings.findOne();

    if (!settings) {
      return res.status(404).json({ message: 'Admin settings not found' });
    }

    return res.json({
      bankName: settings.bankName || 'N/A',
      accountName: settings.accountName || 'N/A',
      accountNumber: settings.accountNumber || 'N/A',
    });
  } catch (err) {
    console.error('Error fetching account info:', err);
    res.status(500).json({ message: 'Failed to fetch account info' });
  }
});


module.exports = router;
