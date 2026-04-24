const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: ["file", "folder"],
      default: "file"
    },

    parentFolder: {
      type: mongoose.Schema.Types.ObjectId || null,
      ref: "File",
      default: null
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    currentVersion: {
      type: Number,
      default: null
    },

    isLocked: {
      type: Boolean,
      default: false
    },

    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    lockedAt: {
      type: Date,
      default: null
    },

    collaborators: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        role: {
          type: String,
          enum: ["editor", "viewer"],
          default: "viewer"
        }
      }
    ],

    isDeleted: {
      type: Boolean,
      default: false
    },

    deletedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

fileSchema.pre("save", async function (next) {
  if (this.type === "folder") {
    this.currentVersion = null;
  } else if (this.type === "file" && !this.currentVersion) {
    this.currentVersion = 1;
  }
});

module.exports = mongoose.model("File", fileSchema);