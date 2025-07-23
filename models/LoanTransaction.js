const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LoanTransaction extends Model {
    static associate(models) {
      // Define associations if needed
      // LoanTransaction.belongsTo(models.User, { foreignKey: 'userId' });
      // LoanTransaction.hasMany(models.Repayment, { foreignKey: 'loanId' });
    }
  }

  LoanTransaction.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    loanId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    interest: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    totalRepayment: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    balance: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    overdueDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    overdueInterest: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('pending', 'declined', 'cleared', 'overdue', 'running'),
      defaultValue: 'pending'
    },
    declineReason: {
      type: DataTypes.STRING
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    dateInitiated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    clearedAt: {
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'LoanTransaction'
  });

  LoanTransaction.beforeCreate(async (loan, options) => {
    const randomId = 'LN' + Math.floor(1000 + Math.random() * 9000);
    loan.loanId = randomId;
  });

  return LoanTransaction;
};
