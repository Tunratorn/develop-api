// app.js
const express = require('express');
const app = express();
const userRoutes = require('./routes/api');
require('dotenv').config(); // โหลดไฟล์ .env

app.use(express.json());

// ใช้ route ที่จัดการโดย controller
app.use('/api', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});