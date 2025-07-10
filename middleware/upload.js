const multer = require('multer');
// const upload = multer({ dest: 'uploads/' }); ❌ remove this

const { storage } = require('../utils/cloudinary'); // adjust path if needed
const upload = multer({ storage });

module.exports = upload;
