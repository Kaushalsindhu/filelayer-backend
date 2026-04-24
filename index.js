const express = require('express');
const env = require('dotenv').config();
const errorHandler = require('./middlewares/errorHandler');
const connectDB = require('./config/dbConnection');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const cloudinary = require('cloudinary').v2;

const userRoutes = require('./routes/userRoutes');
const collabRoutes = require('./routes/collabRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const fileRoutes = require('./routes/fileRoutes');
const versionRoutes = require('./routes/versionRoutes');

cloudinary.config({ 
  cloud_name: 'duwgqsfbu', 
  api_key: '132823984827823', 
  api_secret: 'GTYYVCmssEhF-Kq8QIEFKfjjHnI'
});

connectDB();

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL
];

app.use(
  cors({
    origin: "https://filelayer.vercel.app",
    // credentials: true,              // allow cookies / auth headers
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/files/:fileId/collaborators', collabRoutes);
app.use('/api/v1/files/:fileId/download', downloadRoutes);
app.use('/api/v1/files/:fileId/versions', versionRoutes);
app.use('/api/v1/files', fileRoutes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})
