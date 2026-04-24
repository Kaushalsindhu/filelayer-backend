const formatSize = (bytes) => {
    if (!bytes) return "0 KB";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return ((bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i]);
}

module.exports = formatSize;