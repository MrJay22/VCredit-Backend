// models/index.js
require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Initialize Sequelize with env config
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
  }
);

// Load models
const User = require('./user')(sequelize, DataTypes);
const LoanTransaction = require('./loanTransaction')(sequelize, DataTypes);
const Loan = require('./loan')(sequelize, DataTypes);
const Repayment = require('./repayment')(sequelize, DataTypes);
const ManualPayment = require('./manualPayment')(sequelize, DataTypes);
const AdminSettings = require('./adminSetting')(sequelize, DataTypes);

// Define associations

// User ↔ LoanTransaction
User.hasMany(LoanTransaction, { foreignKey: 'userId' });
LoanTransaction.belongsTo(User, { foreignKey: 'userId' });

// User ↔ Repayment
User.hasMany(Repayment, { foreignKey: 'userId' });
Repayment.belongsTo(User, { foreignKey: 'userId' });

// LoanTransaction ↔ Repayment
LoanTransaction.hasMany(Repayment, { foreignKey: 'loanId' });
Repayment.belongsTo(LoanTransaction, { foreignKey: 'loanId' });

// User ↔ ManualPayment
User.hasMany(ManualPayment, { foreignKey: 'userId' });
ManualPayment.belongsTo(User, { foreignKey: 'userId' });

// LoanTransaction ↔ ManualPayment
LoanTransaction.hasMany(ManualPayment, { foreignKey: 'loanId' });
ManualPayment.belongsTo(LoanTransaction, { foreignKey: 'loanId' });

// User ↔ Loan (Profile Info)
User.hasOne(Loan, { foreignKey: 'userId' });
Loan.belongsTo(User, { foreignKey: 'userId' });

// Export all
const db = {
  sequelize,
  Sequelize,
  User,
  LoanTransaction,
  Loan,
  Repayment,
  ManualPayment,
  AdminSettings
};

module.exports = db;
