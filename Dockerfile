# ---- Base image ----
FROM node:22-slim

# ---- Install system dependencies for Puppeteer ----
RUN apt-get update && apt-get install -y \
  wget \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libxss1 \
  xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# ---- Set working directory ----
WORKDIR /app

# ---- Copy package files first (for caching) ----
COPY package*.json ./

# ---- Install Node dependencies ----
RUN npm install

# ---- Copy the rest of the app ----
COPY . .

# ---- Build frontend (Vite) ----
RUN npm run build

# ---- Cloud Run uses port 8080 ----
EXPOSE 8080

# ---- Start Express server ----
CMD ["npm", "start"]
