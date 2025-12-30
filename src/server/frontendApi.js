import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.URL,
  timeout: 10000,
});