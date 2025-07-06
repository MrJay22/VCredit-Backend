// models/manualPayment.js
module.exports = (sequelize, DataTypes) => {
  const ManualPayment = sequelize.define('ManualPayment', {
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
    timestamps: false // We're manually managing createdAt & updatedAt
  });

  return ManualPayment;
};
