const File = require("../models/fileModel");
const User = require("../models/userModel");


// @desc    Add Collaborator Controller
// @route   POST /api/v1/files/:fileId/collaborators
// @access  Private(owner only)
const addCollaborator = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { username, role } = req.body;
    const currUserId = req.user.userData;

    const collabUser = await User.findOne({ username: username.toLowerCase().trim() });
    if (!collabUser) return res.status(404).json({ message: "User not found" });
    const userId = collabUser._id.toString();

    const file = await File.findById(fileId);
    if (!file || file.isDeleted) return res.status(404).json({ message: "File not found" });
 
    // Owner check
    if (file.owner.toString() !== currUserId) return res.status(403).json({ message: "Only owner can add collaborators" });

    // Prevent duplicate collaborator
    const exists = file.collaborators.some(c => c.user.toString() === userId);
    if (exists) return res.status(409).json({ message: "This user is already a collaborator" });

    file.collaborators.push({user: userId, role: role || "viewer"});
    await file.save();

    await User.findByIdAndUpdate(userId, {$addToSet: {sharedFiles: fileId}});
    
    res.status(201).json({ message: "Collaborator added successfully",});
  }
  catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// @desc    Update Collaborator Controller
// @route   PATCH /api/v1/files/:fileId/collaborators/:collaboratorId
// @access  Private(owner only)
const updateCollaborator = async (req, res) => {
  try {
    const { fileId, collaboratorId } = req.params;
    const currUserId = req.user.userData;
    
    const file = await File.findById(fileId);
    if (!file || file.isDeleted) return res.status(404).json({ message: "File not found" });
    if (file.owner.toString() !== currUserId) return res.status(403).json({ message: "Only owner can update roles" });

    const collaborator = file.collaborators.find(c => c.user.toString() === collaboratorId);
    if (!collaborator) return res.status(404).json({ message: "Collaborator not found" });

    collaborator.role = collaborator.role === "viewer" ? "editor" : "viewer";
    await file.save();

    res.status(200).json({ message: "Collaborator role updated successfully"});
  }
  catch (err) {
    res.status(500).json({ message: err.message });
  }
};


//@desc    Remove Collaborator Controller
//@route   DELETE /api/v1/files/:fileId/collaborators/:collaboratorId
//@access  Private(owner only)

const removeCollaborator = async (req, res) => {
  try {
    const { fileId, collaboratorId } = req.params;
    const currUserId = req.user.userData;

    const file = await File.findById(fileId);
    if (!file || file.isDeleted) return res.status(404).json({ message: "File not found" });

    if (file.owner.toString() !== currUserId) return res.status(403).json({ message: "Only owner can remove collaborators" });
    file.collaborators = file.collaborators.filter(c => c.user.toString() !== collaboratorId);
    await file.save();

    await User.findByIdAndUpdate(collaboratorId, {$pull: {sharedFiles: fileId}});

    res.status(200).json({ message: "Collaborator removed successfully" });
  }
  catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// @desc    Get Collaborators Controller
// @route   GET /api/v1/files/:fileId/collaborators
// @access  Private(owner and collaborators)
const getCollaborators = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId).populate("collaborators.user", "username name");

    if (!file) return res.status(404).json({ message: "File not found" });

    // Format response (clean data for frontend)
    const collaborators = file.collaborators.map((collab) => ({
      user: {
        _id: collab.user._id,
        username: collab.user.username || collab.user.name
      },
      role: collab.role
    }));

    res.status(200).json(collaborators);
  }
  catch (err) {
    res.status(500).json({ message: err.message });
  }
};


module.exports = {addCollaborator, updateCollaborator, removeCollaborator, getCollaborators};