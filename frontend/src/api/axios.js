import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api",
});

// Request interceptor for token & session ID
API.interceptors.request.use((config) => {
    const userInfo = localStorage.getItem("userInfo")
        ? JSON.parse(localStorage.getItem("userInfo"))
        : null;

    if (userInfo && userInfo.token) {
        config.headers.Authorization = `Bearer ${userInfo.token}`;
    }

    if (userInfo && userInfo.sessionId) {
        config.headers["x-session-id"] = userInfo.sessionId;
    }

    return config;
});

export default API;
