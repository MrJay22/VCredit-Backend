const { Loan } = require('../models');

// Get loan details by userId
exports.getLoanByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const loan = await Loan.findOne({ where: { userId } });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    res.status(200).json(loan);
  } catch (err) {
    console.error('Error fetching loan:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Approve loan
exports.approveLoan = async (req, res) => {
  const { userId } = req.params;

  try {
    const loan = await Loan.findOne({ where: { userId } });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    loan.status = 'approved';
    await loan.save();

    res.status(200).json({ message: 'Loan approved', loan });
  } catch (err) {
    console.error('Error approving loan:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Decline loan
exports.declineLoan = async (req, res) => {
  const { userId } = req.params;

  try {
    const loan = await Loan.findOne({ where: { userId } });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    loan.status = 'rejected';
    await loan.save();

    res.status(200).json({ message: 'Loan declined', loan });
  } catch (err) {
    console.error('Error declining loan:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
