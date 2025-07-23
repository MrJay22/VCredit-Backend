const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Repayment extends Model {
    static associate(models) {
      // Define associations here if needed
      // Repayment.belongsTo(models.User, { foreignKey: 'userId' });
      // Repayment.belongsTo(models.LoanTransaction, { foreignKey: 'loanId' });
    }
  }

  Repayment.init({
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
    sequelize,
    modelName: 'Repayment',
    timestamps: false
  });

  return Repayment;
};
