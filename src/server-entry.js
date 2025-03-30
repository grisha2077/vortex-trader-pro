const VortexServer = require("./server");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Create and start the server
const server = new VortexServer();
server.start();
