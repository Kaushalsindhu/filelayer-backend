const formatTimeAgo = (date) => {
    const now = new Date();
      const diff = Math.floor((now - new Date(date)) / 1000); // seconds

      if (diff < 60) return "Just now";

      const minutes = Math.floor(diff / 60);
      if (minutes < 60) return `${minutes} min ago`;

      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;

      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? "s" : ""} ago`;
}

module.exports = formatTimeAgo;