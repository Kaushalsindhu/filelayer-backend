const jwt = require('jsonwebtoken');

const jwtAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")){
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  } 

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // decoded is the id of user
    next();
  } catch (err) {
    return res.status(401).json({ message: err.message });
  }
}

// Function to generate JWT token
const generateToken = (userData) => {
  return jwt.sign({userData}, process.env.JWT_SECRET, {expiresIn: 30000});
}; 

module.exports = {jwtAuthMiddleware, generateToken};