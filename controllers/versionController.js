const File = require("../models/fileModel");
const FileVersion = require("../models/fileVersionModel");
const checkLockTimeout = require('../utils/checkLockTimeout');
const Activity = require("../models/activityModel");
const path = require('path');
const cloudinary = require('cloudinary').v2;

// @desc    Upload new file version controller
// @route   POST /api/v1/files/:fileId/versions
// @access  Private (owner and collaborators with edit access)
const uploadFileVersion = async (req, res) => {
  const { fileId } = req.params;
  const userId = req.user.userData;

  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const file = req.file;
    console.log(file);
    
    // Find the file
    let fileDoc = await File.findById(fileId);
    if (!fileDoc) return res.status(404).json({ message: "File not found" });

    // Access control
    const isOwner = fileDoc.owner.toString() === userId;
    const collaborator = fileDoc.collaborators.find(c => c.user.toString() === userId);
    if (!isOwner && !collaborator) return res.status(403).json({ message: "Access denied" });
    if (collaborator && collaborator.role !== "editor") return res.status(403).json({ message: "Access denied" });
    
    // Lock check and enforcement
    fileDoc = await checkLockTimeout(fileDoc);
    if (!fileDoc.isLocked || fileDoc.lockedBy.toString() !== userId) {
      return res.status(403).json({ message: "File must be locked by you" });
    }

    // Get the latest version number
    const latestVersion = await FileVersion.findOne({ file: fileId }).sort({ versionNumber: -1 });
    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Store in cloudinary and get URL
    const cloudResponse = await cloudinary.uploader.upload(file.path, {folder: "file_management_app"})

    // Create new version
    await FileVersion.create({
      file: fileId,
      versionNumber: newVersionNumber,
      uploadedBy: userId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      extension: path.extname(file.originalname).substring(1),
      size: file.size,
      storagePath: cloudResponse.url
    });
    
    // Update file document
    fileDoc.currentVersion = newVersionNumber;
    fileDoc.isLocked = false;
    fileDoc.lockedBy = null;
    fileDoc.lockedAt = null;
    await fileDoc.save();

    await Activity.create({
        file: fileDoc._id,
        user: userId,
        action: "UPLOAD_VERSION",
        metadata: { versionNumber: newVersionNumber}
    })

    res.status(201).json({ message: `Version v${newVersionNumber} uploaded successfully` });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: err.message });
  }
};


// @desc    Get file versions controller
// @route   GET /api/v1/files/:fileId/versions
// @access  Private(owner and collaborators)
const getFileVersions = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userData;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortOrder = req.query.sort === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const file = await File.findById(fileId);
    if (!file || file.isDeleted) return res.status(404).json({ message: "File not found" });

    // Access control
    const isOwner = file.owner.toString() === userId;
    const isCollaborator = file.collaborators.some(c => c.user.toString() === userId);
    if (!isOwner && !isCollaborator) return res.status(403).json({ message: "Access denied" });

    const totalVersions = await FileVersion.countDocuments({ file: fileId });

    const versions = await FileVersion.find({ file: fileId })
      .sort({ versionNumber: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate("uploadedBy", "name email");

    res.status(200).json({
      data: versions,
      pagination: {
        totalVersions,
        currentPage: page,
        limit,
        totalPages: Math.ceil(totalVersions / limit)
      }
  });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


// @desc  Restore file version controller
// @route  POST /api/v1/files/:fileId/versions/:versionNumber/restore
// @access  Private (owner and collaborators with edit access)
const restoreFileVersion = async (req, res) => {
  try{
    const { fileId } = req.params;
    const versionNumber = Number(req.params.versionNumber);
    const userId = req.user.userData;

    // Find the file
    let file = await File.findById(fileId);
    if (!file || file.isDeleted) return res.status(404).json({ message: "File not found" });

    // Access control
    const isOwner = file.owner.toString() === userId;
    const collaborator = file.collaborators.find(c => c.user.toString() === userId);
    if (!isOwner && !collaborator) return res.status(403).json({ message: "Access denied" });
    if (collaborator && collaborator.role !== "editor") return res.status(403).json({ message: "Access denied" });

    // Lock check
    file = await checkLockTimeout(file);
    if (!file.isLocked || file.lockedBy.toString() !== userId){
      return res.status(403).json({ message: "File must be locked by you" });
    }  

    // Find old version and create new version from it
    const oldVersion = await FileVersion.findOne({file: fileId, versionNumber:versionNumber});
    if (!oldVersion) return res.status(404).json({ message: "Version not found" });

    const newVersionNumber = file.currentVersion + 1;
    const restoredVersion = new FileVersion({
      file: fileId,
      versionNumber: newVersionNumber,
      uploadedBy: userId,
      originalName: oldVersion.originalName,
      mimeType: oldVersion.mimeType,
      extension: oldVersion.extension,
      size: oldVersion.size,
      storagePath: oldVersion.storagePath, 
      storageProvider: oldVersion.storageProvider,
    });
    await restoredVersion.save();

    // Update file document
    file.currentVersion = newVersionNumber;
    file.isLocked = false;
    file.lockedBy = null;
    file.lockedAt = null;
    await file.save();

    await Activity.create({
        file: file._id,
        user: userId,
        action: "UPLOAD_VERSION",
        metadata: { versionNumber: newVersionNumber}
    })

    res.status(200).json({
      message: `Version v${versionNumber} restored as v${newVersionNumber}`,
      restoredVersion
    });
  }
  catch(err){
    res.status(500).json({ message: "Server error" });
  }
}


module.exports = {uploadFileVersion, getFileVersions, restoreFileVersion};