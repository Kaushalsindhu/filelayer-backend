const File = require('../models/fileModel');
const Activity = require('../models/activityModel');

// @desc    Lock File Controller
// @route   POST /api/v1/files/:fileId/lock
// @access  Private
const fileLock = async(req, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.userData;

      const file = await File.findById(fileId);
      if(!file || file.isDeleted) return res.status(404).json({message: "File not found"});

      // Access control
      const isOwner = file.owner.toString() === userId;
      const collaborator = file.collaborators.find(c => c.user.toString() === userId);
      if (!isOwner && !collaborator) return res.status(403).json({ message: "Access denied" });
      if (collaborator && collaborator.role !== "editor") return res.status(403).json({ message: "Access denied" });

      // Check if file is already locked
      if (file.isLocked) {
        if (file.lockedBy.toString() === userId) return res.status(200).json({ message: "File already locked by you" });
        return res.status(409).json({ message: "File is locked by another user" });
      }

      // Lock the file
      file.isLocked = true;
      file.lockedBy = userId;
      file.lockedAt = new Date();
      await file.save();

      Activity.create({
        file: file._id,
        user: userId,
        action: "LOCK_FILE",
      });

      res.status(200).json({ message: "File locked successfully", lockedAt: file.lockedAt });
    }   
    catch (err) {
      res.status(500).json({ message: err.message });
    }
}


// @desc    Unlock File Controller
// @route   POST /api/v1/files/:fileId/unlock
// @access  Private
const fileUnlock = async(req, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.userData;

      const file = await File.findById(fileId);
      if (!file || file.isDeleted) return res.status(404).json({ message: "File not found" });

      // Only owner or locker can unlock
      const isOwner = file.owner.toString() === userId;
      const isLocker = file.lockedBy?.toString() === userId;
      if (!isOwner && !isLocker) return res.status(403).json({ message: "You cannot unlock this file" });

      // Unlock the file
      file.isLocked = false;
      file.lockedBy = null;
      file.lockedAt = null;
      await file.save();

      res.status(200).json({ message: "File unlocked successfully" });
    }
    catch(err){
      res.status(500).json({ message: err.message });
    }
}

module.exports = { fileLock, fileUnlock };