const File = require('../models/fileModel');
const FileVersion = require('../models/fileVersionModel');
const path = require('path');
const User = require('../models/userModel');
const Activity = require('../models/activityModel');
const formatTimeAgo = require('../utils/formatTime');
const getResourceType = require('../utils/getResourceType');
const formatSize = require('../utils/formatSize');
const cloudinary = require('cloudinary').v2;
const  mongoose = require('mongoose');


// @desc    Upload File Controller
// @route   POST /api/v1/files
// @access  Private
const uploadFile = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  
  try{
    // file metadata from multer
    const file = req.file;
    const parentFolder = req.body.parentFolder || null;
    const currUser = await User.findById(req.user.userData);
    console.log(file.mimetype);
    
    // create File document
    const newFile = await File.create({
      originalName: file.originalname,
      owner: currUser._id,
      type: "file",
      parentFolder: parentFolder
    });

    currUser.ownedFiles.push(newFile._id);
    await currUser.save();

    // Store in cloudinary and get URL

    const cloudResponse = await cloudinary.uploader.upload(file.path, {
      folder: "file_management_app",
      resource_type: getResourceType(file)
    });

    console.log("Cloudinary response:", cloudResponse);

    // create first version
    await FileVersion.create({
      file: newFile._id,
      versionNumber: 1,
      uploadedBy: currUser._id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      extension: path.extname(file.originalname).substring(1),
      size: file.size,
      storagePath: cloudResponse.url
    });

    await Activity.create({
      file: newFile._id,
      user: currUser._id,
      action: "CREATE_FILE",
      metadata: { fileName: newFile.name }
    });

    console.log("File uploaded successfully");

    res.status(201).json({ message: "File uploaded successfully" });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};


// @desc    Soft Delete File controller
// @route   DELETE /api/v1/files/:fileId
// @access  Private
const softDeleteFile = async (req, res) => {
  try{
    const { fileId } = req.params;
    const userId = req.user.userData;

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    // Permission check
    if (!file.owner.equals(userId)) return res.status(403).json({ message: "Only owner can delete the file" });

    if(file.type === "folder") {
      const children = await File.find({ parentFolder: file._id });
      for (let child of children) {
        child.isDeleted = true;
        child.deletedAt = new Date();
        await child.save();
      }

      await Activity.create({
        file: file._id,
        user: userId,
        action: "DELETE_FOLDER"
      });

      file.isDeleted = true;
      file.deletedAt = new Date();
      await file.save();
      return res.json({ message: "Files of the folder are moved to bin" });
    }

    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();

    await Activity.create({
      file: file._id,
      user: userId,
      action: "DELETE_FILE"
    });

    res.json({ message: "File moved to bin" });
  }
  catch(err){
    res.status(500).json({ message: "Server error" });
  }
};


// @desc    Permanent Delete File controller
// @route   DELETE /api/v1/files/:fileId
// @access  Private
const permanentDeleteFile = async (req, res) => {
  try{
    const { fileId } = req.params;
    const userId = req.user.userData;

    const file = await File.findById(fileId);
    if (!file || !file.isDeleted) return res.status(404).json({ message: "File not found in bin" });
    if (!file.owner.equals(userId)) return res.status(403).json({ message: "Not allowed" });

    // Delete all versions
    await FileVersion.deleteMany({ file: file._id });

    // Delete the file document
    await File.deleteOne({ _id: file._id });

    if(file.type === "folder") {
      res.json({ message: "Folder permanently deleted" });
    }

    res.json({ message: "File permanently deleted" });
  }
  catch(err){
    res.status(500).json({ message: "Server error" });
  }
};


// @desc    Restore File controller
// @route   POST /api/v1/files/:fileId/restore
// @access  Private
const restoreFile = async (req, res) => {
  try{
    const { fileId } = req.params;
    const userId = req.user.userData;

    const file = await File.findById(fileId);
    if (!file || !file.isDeleted) return res.status(404).json({ message: "File not found in bin" });
    if (!file.owner.equals(userId)) return res.status(403).json({ message: "Not allowed" });

    if(file.type === "folder") {
      const children = await File.find({ parentFolder: file._id });
      for (let child of children) {
        child.isDeleted = false;
        child.deletedAt = null;
        await child.save();
      }
    }

    file.isDeleted = false;
    file.deletedAt = null;
    if(file.parentFolder !== null) {
      const parent = await File.findById(file.parentFolder);
      if (!parent || parent.isDeleted) file.parentFolder = null;
    }
    await file.save();

    await Activity.create({
      file: file._id,
      user: userId,
      action: "RESTORE_FILE"
    });

    if(file.type === "folder") {
      return res.json({ message: "Folder and its files are restored" });
    }

    res.json({ message: "File restored successfully" });
  }
  catch(err){
    res.status(500).json({ message: err.message });
  }
};

const getActivityLog = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userData;

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    // Owner or collaborator only
    const isOwner = file.owner.toString() === userId;
    const collaborator = file.collaborators.find(c => c.user.toString() === userId);
    if (!isOwner && !collaborator) return res.status(403).json({ message: "Access denied" });

    const activities = await Activity.find({ file: fileId })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(activities);
  }
  catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const createFolder = async (req, res) => {
  try {
    const { name, parentFolder } = req.body;
    const userId = req.user.userData;

    if (!name) return res.status(400).json({message: "Folder name is required"});

    const folder = await File.create({
      originalName: name,
      type: "folder",
      owner: userId,
      parentFolder: parentFolder
    });

    res.status(201).json({message: "Folder created successfully",});

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
};



const getBreadcrumb = async (req, res) => {
  const { folderId } = req.params;
  try {
    let path = [];
    let current = await File.findById(folderId);

    while (current) {
      path.unshift({
        _id: current._id,
        name: current.originalName
      }); 
      current = current.parentFolder? await File.findById(current.parentFolder) : null;
    } 
    res.json(path);
  } catch (err) {
    res.status(500).json({ message: "Error fetching breadcrumb" });
  }
};



const fetchFiles = async (req, res) => {
  try {
    const userId = req.user.userData;
    let { parentFolder } = req.query;

    if (!parentFolder) parentFolder = null;

    const files = await File.find({
      owner: userId,
      parentFolder: parentFolder,
      isDeleted: false
    })
    .populate("owner", "name")
    .sort({ createdAt: -1 });

    const fileIds = files
      .filter(f => f.type === "file")
      .map(f => f._id);

    const versions = await FileVersion.find({
      file: { $in: fileIds }
    }).sort({ version: -1 });

    // Map latest version
    const versionMap = {};
    for (let v of versions) {
      if (!versionMap[v.file]) {
        versionMap[v.file] = v;
      }
    }

    const formatted = files.map(file => {
      const latestVersion = versionMap[file._id];
      return {
        _id: file._id,
        name: file.originalName,
        type: file.type,
        owner: file.owner?.name || "Unknown",
        modified: formatTimeAgo(file.updatedAt),
        size: file.type === "folder"? "-": latestVersion? formatSize(latestVersion.size): "0 KB",
        url: latestVersion?.storagePath || null
      };
    });
    res.status(200).json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch files"
    });
  }
}



const getDeletedFiles = async (req, res) => {
  try {
    const userId = req.user.userData;
    const deletedFiles = await File.find({
      owner: userId,
      isDeleted: true,
      parentFolder: null
    }) .populate("owner", "name");

    const formatted = deletedFiles.map(file => ({
      _id: file._id,
      name: file.originalName,
      type: file.type,
      owner: file.owner?.name || "Unknown",
      modified: formatTimeAgo(file.updatedAt),
    }))

    res.status(200).json(formatted);
  }
  catch(err){
    console.error(err);
    res.status(500).json({ message: err.message });
  }
}



const renameFolder = async (req, res) => {
  try{
    await File.findByIdAndUpdate(
      req.params.fileId,
      { originalName: req.body.newName },
    );
    return res.json({ message: "Folder renamed successfully" });
  } 
  catch(err){
    res.status(500).json({ message: err.message });
  }
}



const getFileUrl = async (req, res) => {
  try{
    const file = await File.findById(req.params.fileId);
    console.log(file)
    if (!file) return res.status(404).json({ message: "File not found" });
    if (file.type !== "file") return res.status(400).json({ message: "Not a file" });
    const latestVersion = await FileVersion.findOne({file: file._id, versionNumber: file.currentVersion});
    console.log("Latest version:", latestVersion);
    return res.json({ url: latestVersion.storagePath });
  }
  catch(err){
    res.status(500).json({ message: err.message });
  }
}


const getSharedFiles = async (req, res) => {
  try {
    const userId = req.user.userData;
    const sharedFiles = await File.find({
      collaborators: {
        $elemMatch: {user: userId}
      },
      isDeleted: false
    }).populate("owner", "name");

    const fileIds = sharedFiles .filter(f => f.type === "file").map(f => f._id);

    const versions = await FileVersion.find({
      file: { $in: fileIds }
    }).sort({ version: -1 });

    // Map latest version
    const versionMap = {};
    for (let v of versions) {
      if (!versionMap[v.file]) {
        versionMap[v.file] = v;
      }
    }

    const formatted = sharedFiles.map(file => {
      const latestVersion = versionMap[file._id];
      return {
        _id: file._id,
        name: file.originalName,
        type: file.type,
        owner: file.owner?.name || "Unknown",
        modified: formatTimeAgo(file.updatedAt),
        size: file.type === "folder"? "-": latestVersion? formatSize(latestVersion.size): "0 KB",
        url: latestVersion?.storagePath || null
      };
    });
    res.status(200).json(formatted);
  }
  catch(err){
    console.error(err);
    res.status(500).json({ message: err.message });
  }
}



const moveFile = async (req, res) => {
  try{
    const { fileId } = req.params;
    const { targetFolderName } = req.body;
    const userId = req.user.userData;

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });
    if (!file.owner.equals(userId)) return res.status(403).json({ message: "Only owner can move the file" });

    const targetFolder = await File.findOne({ originalName: targetFolderName, type: "folder", isDeleted: false });
    if (!targetFolder) return res.status(404).json({ message: "Target folder not found" });
    if (targetFolder.type !== "folder") return res.status(400).json({ message: "Target is not a folder" });
    file.parentFolder = targetFolder._id ;
    await file.save();

    return res.json({ message: "File moved successfully" });
  }
  catch(err){
    console.error(err);
    res.status(500).json({ message: err.message });
  };
}



const searchFiles = async (req, res) => {
  try{
    const userId = req.user.userData; 
    const { query } = req.query;

    if (!query) return res.json([]);

    const files = await File.find({
      isDeleted: false,
      originalName: { $regex: query, $options: "i" }, // case-insensitive search
      $or: [
        { owner: userId },
        { "collaborators.user": userId }
      ]
    }) .populate("owner", "name").limit(10);

    const formatted = files.map(file => ({
      _id: file._id,
      name: file.originalName,
      type: file.type,
      owner: file.owner?.name || "Unknown",
      modified: formatTimeAgo(file.updatedAt),
    }))

    console.log("Search results:", files);


    res.json(formatted);
  }
  catch(err){
    console.error(err);
    res.status(500).json({ message: err.message });
  }
}


module.exports = {
  uploadFile, 
  softDeleteFile, 
  restoreFile, 
  getActivityLog, 
  createFolder, 
  fetchFiles,
  getBreadcrumb,
  renameFolder,
  getFileUrl,
  getDeletedFiles,
  permanentDeleteFile,
  getSharedFiles,
  moveFile,
  searchFiles
};