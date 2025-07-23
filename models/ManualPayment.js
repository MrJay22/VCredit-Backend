const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ManualPayment extends Model {
    static associate(models) {
      // Define associations here if needed
      // ManualPayment.belongsTo(models.User, { foreignKey: 'userId' });
      // ManualPayment.belongsTo(models.LoanTransaction, { foreignKey: 'loanId' });
    }
  }

  ManualPayment.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    loanId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    senderName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    note: {
      type: DataTypes.STRING
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'ManualPayment',
    timestamps: false
  });

  return ManualPayment;
};
