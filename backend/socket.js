let io;

module.exports = {
    init: (server) => {
        io = require("socket.io")(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        io.on("connection", (socket) => {
            console.log("🔌 New Client Connected:", socket.id);

            socket.on("join", (userId) => {
                socket.join(userId);
                console.log(`👤 User joined room: ${userId}`);
            });

            socket.on("disconnect", () => {
                console.log("🔌 Client Disconnected");
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error("Socket.io not initialized!");
        }
        return io;
    }
};
