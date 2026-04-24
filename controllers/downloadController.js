const path = require("path");
const fs = require("fs");
const File = require("../models/fileModel");
const FileVersion = require("../models/fileVersionModel");


// @desc    Download latest version of a file
// @route   GET /api/v1/files/:fileId/download
// @access  Private (collaborators and owner)
const downloadLatestVersion = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userData;

    const file = await File.findById(fileId);
    if (!file || file.isDeleted) return res.status(404).json({ message: "File not found" });

    // Access check
    const isOwner = file.owner.toString() === userId;
    const isCollaborator = file.collaborators.some(c => c.user.toString() === userId);
    if (!isOwner && !isCollaborator) return res.status(403).json({ message: "Access denied" });

    // Get latest version
    const latestVersion = await FileVersion.findOne({ file: fileId }) .sort({ versionNumber: -1 });

    if (!latestVersion)
      return res.status(404).json({ message: "No versions found" });

    if (!fs.existsSync(latestVersion.storagePath))
      return res.status(404).json({ message: "File not found on disk" });

    return res.download(
      latestVersion.storagePath,
      latestVersion.originalName
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// @desc    Download specific version of a file
// @route   GET /api/v1/files/:fileId/versions/:versionNumber/download
// @access  Private (collaborators and owner)
const downloadSpecificVersion = async (req, res) => {
  try {
    const { fileId, versionNumber } = req.params;
    const userId = req.user.userData;

    const file = await File.findById(fileId);
    if (!file || file.isDeleted) return res.status(404).json({ message: "File not found" });

    // Access check
    const isOwner = file.owner.toString() === userId;
    const isCollaborator = file.collaborators.some(c => c.user.toString() === userId);
    if (!isOwner && !isCollaborator) return res.status(403).json({ message: "Access denied" });

    const version = await FileVersion.findOne({file: fileId, versionNumber: Number(versionNumber)});
    if (!version) return res.status(404).json({ message: "Version not found" });
    if (!fs.existsSync(version.storagePath)) return res.status(404).json({ message: "File not found on disk" });

    return res.download(version.storagePath, version.originalName);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } 
};

module.exports = { downloadLatestVersion, downloadSpecificVersion };  