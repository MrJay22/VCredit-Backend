const { LoanTransaction, User, Repayment } = require('../models');

/**
 * Automatically attempt loan repayment using wallet balance.
 * @param {String} userId
 * @param {Object} options
 * @returns {Object} result of the operation
 */
const attemptAutoRepayment = async (userId, { allowBeforeOverdue = false } = {}) => {
  try {
    const loan = await LoanTransaction.findOne({
      where: { userId, status: 'running' },
    });

    const user = await User.findByPk(userId);

    if (!loan || !user) {
      return { success: false, reason: 'No active loan or user' };
    }

    const isOverdue = loan.dueDate < new Date();

    if (!isOverdue && !allowBeforeOverdue) {
      return { success: false, reason: 'Not overdue and not allowed' };
    }

    if (user.walletBalance <= 0) {
      return { success: false, reason: 'Insufficient wallet balance' };
    }

    const amountToPay = Math.min(user.walletBalance, loan.balance);

    // Deduct from wallet
    user.walletBalance -= amountToPay;
    await user.save();

    // Update loan
    loan.balance -= amountToPay;
    if (loan.balance === 0) {
      loan.status = 'cleared';
      loan.clearedAt = new Date();
    }
    await loan.save();

    // Save repayment history
    await Repayment.create({
      userId,
      loanId: loan.id,
      amount: amountToPay,
      method: 'auto-debit',
      status: 'success',
    });

    return { success: true, amountPaid: amountToPay };
  } catch (err) {
    console.error('Auto repayment failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Calculate overdue interest and days.
 * @param {Object} loan - Sequelize loan instance
 * @param {Object} overdueSetting - { type: 'percent'|'fixed', value: number }
 * @returns {Object} { overdueDays, overdueInterest }
 */
const calculateOverdue = (loan, overdueSetting) => {
  const today = new Date();
  const dueDate = new Date(loan.dueDate);
  const dayDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
  const overdueDays = dayDiff;

  let overdueInterest = 0;
  if (overdueDays > 0 && overdueSetting) {
    if (overdueSetting.type === 'percent') {
      overdueInterest = Math.floor(loan.amount * (overdueSetting.value / 100) * overdueDays);
    } else {
      overdueInterest = overdueSetting.value * overdueDays;
    }
  }

  return { overdueDays, overdueInterest };
};

module.exports = {
  attemptAutoRepayment,
  calculateOverdue,
};
