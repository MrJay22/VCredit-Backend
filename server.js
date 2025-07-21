require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./models'); // Sequelize models/index.js

// Routes
const authRoutes = require('./routes/auth');
const meRoute = require('./routes/me');
const walletRoutes = require('./routes/wallet');
const loanRoutes = require('./routes/loan'); // All loan endpoints
const adminRoutes = require('./routes/admin');

const adminAuthRoutes = require('./routes/adminAuth');



const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));



// ✅ Needed for multipart/form-data text fields (alongside multer)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Logger
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// ✅ Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// ✅ Serve uploads publicly
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/auth', authRoutes);
app.use('/api/loan', loanRoutes);
app.use('/wallet', walletRoutes);
app.use('/', meRoute);
app.use('/api/admin', adminRoutes);

// Start DB and Server
db.sequelize.authenticate()
  .then(() => {
    console.log('✅ MySQL Connected');
    return db.sequelize.sync({ alter: true });
  })
  .then(() => {
    const PORT = process.env.PORT || 8083;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
  });
