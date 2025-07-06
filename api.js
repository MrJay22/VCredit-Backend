import axios from 'axios';

const API = axios.create({
  baseURL: 'http://192.168.43.213:8088', // ⬅️ Change this to your server URL
});

export default API;
