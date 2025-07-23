const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Loan extends Model {
    static associate(models) {
      // Define associations here if needed
      // Loan.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }

  Loan.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    // Personal Details
    name: DataTypes.STRING,
    phone: DataTypes.STRING,
    bvn: DataTypes.STRING,
    occupation: DataTypes.STRING,

    // Bank Details
    bankName: DataTypes.STRING,
    accountNumber: DataTypes.STRING,
    accountName: DataTypes.STRING,

    dob: DataTypes.STRING,
    address: DataTypes.STRING,

    // Guarantor 1
    guarantor1Name: DataTypes.STRING,
    guarantor1Phone: DataTypes.STRING,
    guarantor1Relationship: DataTypes.STRING,

    // Guarantor 2
    guarantor2Name: DataTypes.STRING,
    guarantor2Phone: DataTypes.STRING,
    guarantor2Relationship: DataTypes.STRING,

    // Emergency Contact
    emergencyContactName: DataTypes.STRING,
    emergencyContactPhone: DataTypes.STRING,
    emergencyContactRelationship: DataTypes.STRING,

    // Documents
    photo: DataTypes.STRING,
    idImage: DataTypes.STRING,

    status: {
      type: DataTypes.ENUM('pending', 'reviewed', 'rejected', 'approved'),
      defaultValue: 'pending'
    },

    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }

  }, {
    sequelize,
    modelName: 'Loan',
    timestamps: false
  });

  return Loan;
};
