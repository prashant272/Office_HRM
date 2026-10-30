import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Replace with your desktop's local IP address (e.g., 192.168.1.5)
const BASE_URL = "http://192.168.31.246:5000/api";

const API = axios.create({
  baseURL: BASE_URL,
});

API.interceptors.request.use(async (config) => {
  const userInfo = await AsyncStorage.getItem("userInfo");
  if (userInfo) {
    const { token } = JSON.parse(userInfo);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
