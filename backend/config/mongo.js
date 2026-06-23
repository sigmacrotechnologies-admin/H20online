const dns = require("dns");

/** Windows often fails SRV lookup for mongodb+srv — use public DNS. */
function prepareAtlasDns(uri) {
  if (process.platform === "win32" && uri && String(uri).startsWith("mongodb+srv://")) {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }
}

const mongooseOptions = {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
};

module.exports = { prepareAtlasDns, mongooseOptions };
