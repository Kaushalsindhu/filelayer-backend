const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
    {
        file: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "File",
            required: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        action: {
            type: String,
            enum: [
            "CREATE_FILE",
            "UPLOAD_VERSION",
            "LOCK_FILE",
            "UNLOCK_FILE",
            "DELETE_FILE",
            "DELETE_FOLDER",
            "RESTORE_FILE",
            "PERMANENT_DELETE"
            ],
            required: true
        },

        metadata: {
            type: Object,
            default: {}
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
