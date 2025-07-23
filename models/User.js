const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    async comparePassword(enteredPassword) {
      return await bcrypt.compare(enteredPassword, this.password);
    }

    static associate(models) {
      // Define associations here if needed
      // For example:
      // User.hasMany(models.Loan, { foreignKey: 'userId' });
      // User.hasMany(models.Repayment, { foreignKey: 'userId' });
    }
  }

  User.init({
    name: {
      type: DataTypes.STRING
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    walletBalance: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    eligibleAmount: {
      type: DataTypes.FLOAT,
      defaultValue: 5000
    },
    avatar: {
      type: DataTypes.STRING,
      defaultValue: 'https://via.placeholder.com/100'
    },
    notificationsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'User',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  });

  return User;
};
