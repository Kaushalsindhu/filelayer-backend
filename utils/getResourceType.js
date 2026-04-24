const getResourceType = (file) => {
  const ext = file.originalname.split(".").pop().toLowerCase();

  if (["ppt", "pptx"].includes(ext)) return "raw";
  return "auto";
};

module.exports = getResourceType;