// models/repayment.js
module.exports = (sequelize, DataTypes) => {
  const Repayment = sequelize.define('Repayment', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    loanId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    method: {
      type: DataTypes.ENUM('manual', 'auto-debit'),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'success'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: false // you're manually defining createdAt
  });

  return Repayment;
};
