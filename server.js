require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./models'); // Sequelize models/index.js

// Route files
const authRoutes = require('./routes/auth');
const meRoute = require('./routes/me');
const walletRoutes = require('./routes/wallet');
const loanRoutes = require('./routes/loan'); // All loan endpoints

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Request Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/loan', loanRoutes);
app.use('/wallet', walletRoutes);
app.use('/', meRoute);

// ✅ Sequelize DB connection
db.sequelize.authenticate()
  .then(() => {
    console.log('✅ MySQL Connected');

    // Auto-create tables if needed
    return db.sequelize.sync({ alter: true }); // { force: true } to wipe & recreate
  })
  .then(() => {
    const PORT = process.env.PORT || 8083;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
  });
