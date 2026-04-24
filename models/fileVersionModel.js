const mongoose = require("mongoose");

const fileVersionSchema = new mongoose.Schema(
  {
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      required: true
    },

    versionNumber: {
      type: Number,
      required: true
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    originalName: {
      type: String,
      required: true,
      trim: true
    },

    mimeType: {
      type: String,
      required: true
    },

    extension: {
      type: String,
      required: true
    },

    size: {
      type: Number,
      required: true
    },

    storagePath: {
      type: String,
      required: true
    },

    storageProvider: {
      type: String,
      enum: ["local", "s3", "cloudinary"],
      default: "local"
    }
  },
  { timestamps: true }
);

// ensure unique version per file
fileVersionSchema.index({ file: 1, versionNumber: 1 }, { unique: true });

module.exports = mongoose.model("FileVersion", fileVersionSchema);
