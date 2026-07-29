# 🎬 Cinemastream - Premium Streaming Platform

## ✨ Features
- 🚀 High-performance streaming
- 🎨 Netflix-style UI with glassmorphism
- 📱 Fully responsive design
- 🔒 Ad-free experience
- ⚡ Sub-millisecond caching
- 🎯 15+ streaming providers

## 🛠️ Tech Stack
- **Backend:** Node.js, Express, Redis
- **Frontend:** HTML5, Tailwind CSS, JavaScript
- **Video:** HLS.js, Plyr
- **API:** TMDb, Concurrent Scraping

## 📦 Installation

### Prerequisites
- Node.js (v18+)
- Redis Server
- TMDb API Key

### Setup
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/cinemastream.git
cd cinemastream

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your TMDb API key

# Start Redis
sudo systemctl start redis

# Run application
npm start
