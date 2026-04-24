const User = require('../models/userModel');
const File = require('../models/fileModel');
const Activity = require('../models/activityModel');
const {generateToken} = require('../config/jwt');
const bcrypt = require('bcryptjs');


// @desc    Signup Controller
// @route   GET /api/v1/users/signup
// @access  Public
const signup = async(req, res) => {
  try{
    // Create new user
    const data = req.body;
    const user = await User.create(data);
    console.log("User Signed up");

    // generate token using user._id
    const token =  generateToken(user.id);
    console.log("Token Generated");

    res.status(200).json({token, user: {id: user._id, name: user.name, email: user.email, username: user.username},});
  }
  catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// @desc    Login Controller
// @route   POST /api/v1/users/login
// @access  Public
const login = async(req, res) => {
  try{
    // Find user by username and compare password
    const { username, password } = req.body;
    const user = await User.findOne({username}).select("+password");
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // generate token using user._id
    const token = generateToken(user.id);
    console.log("User Logged in successfully");
    res.status(200).json({token, user: { id: user._id, username: user.username, name: user.name, email: user.email } });
  }
  catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// @desc    Profile Controller
// @route   GET /api/v1/users/profile
// @access  Private
const profile = async(req, res) => {
  try{
    const userId = req.user.userData;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  }
  catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const dashboard = async(req, res) => {
  try{
    const userId = req.user.userData; 

    const files = await File.find({
      $or: [
        { owner: userId },
        { "collaborators.user": userId }
      ],
      isDeleted: false,
      type: "file" 
    })
      .select("originalName currentVersion updatedAt owner")
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("owner", "name");

    const recentFilesData = files.map(file => ({
      _id: file._id,
      originalName: file.originalName,
      currentVersion: file.currentVersion,
      updatedAt: file.updatedAt,
      ownerName: file.owner.name,
      isOwner: file.owner._id.toString() === userId
    }));

    const [
    myFiles,
    sharedFiles,
    deletedFiles,
    recentFiles,
    recentActivity
    ] = await Promise.all([
      File.countDocuments({ owner: userId, isDeleted: false, type: "file" }),
      File.countDocuments({ "collaborators.user": userId, isDeleted: false }),
      File.countDocuments({ owner: userId, isDeleted: true, type: "file" }),
      recentFilesData,
      Activity.find({ user: userId }).populate("file", "originalName").sort({ createdAt: -1 }).limit(5)
  ]);

  res.json({
    stats: {
      myFiles,
      sharedFiles,
      deletedFiles
    },
    recentFiles,
    recentActivity
  });
  }
  catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { signup, login, profile, dashboard };