const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const User = require('../models/User');

exports.repayLoan = async (req, res) => {
  const { userId, amount } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const loan = await Loan.findOne({ userId, status: 'active' });
    if (!loan) return res.status(400).json({ error: 'No active loan found' });

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Invalid repayment amount' });
    }

    // Optional: Apply overdue interest based on dueDate
    const now = new Date();
    if (loan.dueDate < now && !loan.overdueInterest) {
      const overdueDays = Math.floor((now - loan.dueDate) / (1000 * 60 * 60 * 24));
      const penaltyPerDay = 100; // Adjust as needed
      loan.overdueInterest = overdueDays * penaltyPerDay;
    }

    const totalOwed = loan.principal + loan.interest + (loan.overdueInterest || 0);
    const remainingBalance = totalOwed - loan.amountRepaid;

    if (numericAmount > remainingBalance) {
      return res.status(400).json({ error: 'Repayment exceeds remaining balance' });
    }

    // Record repayment
    await Repayment.create({ userId, amount: numericAmount, date: new Date() });

    // Update loan status
    loan.amountRepaid += numericAmount;
    if (loan.amountRepaid >= totalOwed) {
      loan.status = 'cleared';
    }

    await loan.save();

    res.status(200).json({
      message: 'Repayment successful',
      loan: {
        id: loan._id,
        status: loan.status,
        totalRepaid: loan.amountRepaid,
        totalOwed,
        remainingBalance: totalOwed - loan.amountRepaid,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
};

// ✅ NEW: Check if user has completed the loan application form
exports.checkLoanFormStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id); // assumes authMiddleware is used before this

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFormComplete = user.bvn && user.address && user.employmentStatus;

    res.status(200).json({
      hasCompletedForm: !!isFormComplete,
    });
  } catch (err) {
    console.error('Loan form status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
