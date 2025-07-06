// models/adminSettings.js
module.exports = (sequelize, DataTypes) => {
  const AdminSettings = sequelize.define('AdminSettings', {
    overdueType: {
      type: DataTypes.ENUM('percent', 'fixed'),
      defaultValue: 'percent'
    },
    overdueValue: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    eligibleAmount: {
      type: DataTypes.FLOAT,
      defaultValue: 5000
    },
    minAmount: {
      type: DataTypes.FLOAT,
      defaultValue: 1000
    },
    notice: {
      type: DataTypes.STRING,
      defaultValue: 'Loan must be repaid before the due date to avoid overdue charges.'
    },
    bankName: {
      type: DataTypes.STRING
    },
    accountName: {
      type: DataTypes.STRING
    },
    accountNumber: {
      type: DataTypes.STRING
    },
    // 👇 Add this new field for multiple loan term options
    loanTerms: {
      type: DataTypes.JSON,
      defaultValue: [
        { days: 7, interestType: 'percent', interestValue: 25 },
        { days: 14, interestType: 'percent', interestValue: 40 }
      ]
    },
  }, {
    timestamps: true
  });

  return AdminSettings;
};
