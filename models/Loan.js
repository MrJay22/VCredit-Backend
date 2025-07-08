// models/loan.js
module.exports = (sequelize, DataTypes) => {
  const Loan = sequelize.define('Loan', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    // Personal Details
    name: {
      type: DataTypes.STRING
    },
    phone: {
      type: DataTypes.STRING
    },
    bvn: {
      type: DataTypes.STRING
    },
    occupation: {
      type: DataTypes.STRING
    },
     // Bank Details
    bankName: {
      type: DataTypes.STRING
    },
    accountNumber: {
      type: DataTypes.STRING
    },
    accountName: {
      type: DataTypes.STRING
    },
    
    dob: {
      type: DataTypes.STRING
    },
    address: {
      type: DataTypes.STRING
    },

    // Guarantor 1
    guarantor1Name: {
      type: DataTypes.STRING
    },
    guarantor1Phone: {
      type: DataTypes.STRING
    },
    guarantor1Relationship: {
      type: DataTypes.STRING
    },

    // Guarantor 2
    guarantor2Name: {
      type: DataTypes.STRING
    },
    guarantor2Phone: {
      type: DataTypes.STRING
    },
    guarantor2Relationship: {
      type: DataTypes.STRING
    },

    // emergencyContact
    emergencyContactName: {
      type: DataTypes.STRING
    },
    emergencyContactPhone: {
      type: DataTypes.STRING
    },
    emergencyContactRelationship: {
      type: DataTypes.STRING
    },

    // Photo (URL or path)
    photo: {
      type: DataTypes.STRING
    },
    idImage: {
      type: DataTypes.STRING
    },

    status: {
      type: DataTypes.ENUM('pending', 'declined', 'cleared', 'overdue', 'running'),
      defaultValue: 'cleared'
    },

    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: false // You already define createdAt manually
  });

  return Loan;
};
