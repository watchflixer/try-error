// server.js - Complete Backend Implementation
const express = require('express');
const axios = require('axios');
const Redis = require('ioredis');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// ==================== CONFIGURATION ====================
const app = express();
const PORT = process.env.PORT || 3000;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Redis Cache Configuration
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3
});

// ==================== MIDDLEWARE ====================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.plyr.io"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.plyr.io"],
            imgSrc: ["'self'", "data:", "https://image.tmdb.org", "https://*.tmdb.org"],
            mediaSrc: ["'self'", "blob:", "https://*.m3u8", "https://*.m3u8.com"],
            frameSrc: ["'self'", "https://*.vidsrc.*", "https://*.embed.*", "https://*.superembed.*"],
            connectSrc: ["'self'", "https://api.themoviedb.org", "https://*.m3u8.com"]
        }
    }
}));

app.use(compression());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// ==================== STREAMING PROVIDERS (UPDATED) ====================
const STREAM_PROVIDERS = [
    {
        name: 'VidLink',
        url: 'https://vidlink.pro/embed/{imdb_id}',
        type: 'direct',
        priority: 1
    },
    {
        name: 'Vidsrc CC',
        url: 'https://vidsrc.cc/v2/embed/{imdb_id}',
        type: 'direct',
        priority: 2
    },
    {
        name: 'Vidsrc Me',
        url: 'https://vidsrc.me/embed/{imdb_id}',
        type: 'direct',
        priority: 3
    },
    {
        name: 'SuperEmbed',
        url: 'https://superembed.stream/embed/{imdb_id}',
        type: 'direct',
        priority: 4
    },
    {
        name: 'Vidify',
        url: 'https://vidify.top/embed/{imdb_id}',
        type: 'direct',
        priority: 5
    },
    {
        name: 'Embed.su',
        url: 'https://embed.su/embed/{imdb_id}',
        type: 'direct',
        priority: 6
    },
    {
        name: 'AutoEmbed',
        url: 'https://autoembed.to/embed/{imdb_id}',
        type: 'direct',
        priority: 7
    },
    {
        name: '2Embed',
        url: 'https://2embed.cc/embed/{imdb_id}',
        type: 'direct',
        priority: 8
    },
    {
        name: 'Moviesapi Club',
        url: 'https://moviesapi.club/embed/{imdb_id}',
        type: 'direct',
        priority: 9
    },
    {
        name: 'NoxEmbed',
        url: 'https://noxembed.com/embed/{imdb_id}',
        type: 'direct',
        priority: 10
    },
    {
        name: 'Smashystream',
        url: 'https://smashystream.xyz/embed/{imdb_id}',
        type: 'direct',
        priority: 11
    },
    {
        name: 'Vidsrc XYZ',
        url: 'https://vidsrc.xyz/embed/{imdb_id}',
        type: 'direct',
        priority: 12
    },
    {
        name: 'Vidsrc Pro',
        url: 'https://vidsrc.pro/embed/{imdb_id}',
        type: 'direct',
        priority: 13
    },
    {
        name: 'Embed.cc',
        url: 'https://embed.cc/embed/{imdb_id}',
        type: 'direct',
        priority: 14
    },
    {
        name: 'Streamnest',
        url: 'https://streamnest.co/embed/{imdb_id}',
        type: 'direct',
        priority: 15
    }
];

// ==================== HELPER FUNCTIONS ====================
function extractM3U8FromHTML(html) {
    const m3u8Regex = /(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/gi;
    const matches = html.match(m3u8Regex);
    return matches ? matches[0] : null;
}

function extractEmbedURL(html) {
    const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/i;
    const match = html.match(iframeRegex);
    return match ? match[1] : null;
}

async function fetchStreamWithTimeout(url, timeout = 2500) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await axios.get(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: timeout,
            maxRedirects: 5,
            validateStatus: status => status >= 200 && status < 400
        });
        
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            throw new Error('Timeout');
        }
        throw error;
    }
}

function generateCacheKey(tmdbId, season = null, episode = null) {
    let key = `stream:${tmdbId}`;
    if (season !== null && episode !== null) {
        key += `:s${season}:e${episode}`;
    }
    return key;
}

// ==================== TMDB TO IMDB CONVERTER ====================
async function tmdbToImdb(tmdbId, type = 'movie') {
    try {
        const cacheKey = `imdb:${type}:${tmdbId}`;
        const cached = await redis.get(cacheKey);
        if (cached) return cached;

        const endpoint = type === 'movie' 
            ? `/movie/${tmdbId}/external_ids` 
            : `/tv/${tmdbId}/external_ids`;
        
        const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
            params: { api_key: TMDB_API_KEY }
        });
        
        const imdbId = response.data.imdb_id;
        if (imdbId) {
            await redis.setex(cacheKey, 86400, imdbId);
        }
        return imdbId;
    } catch (error) {
        console.error(`TMDB to IMDb conversion error: ${error.message}`);
        return null;
    }
}

// ==================== CONCURRENT STREAM SCRAPER ====================
async function scrapeStreams(tmdbId, season = null, episode = null, type = 'movie') {
    const cacheKey = generateCacheKey(tmdbId, season, episode);
    
    const cached = await redis.get(cacheKey);
    if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 300000) {
            return parsed.streams;
        }
    }

    const imdbId = await tmdbToImdb(tmdbId, type);
    if (!imdbId) {
        throw new Error('Could not convert TMDB ID to IMDb ID');
    }

    const providerUrls = STREAM_PROVIDERS.map(provider => {
        let url = provider.url.replace('{imdb_id}', imdbId);
        if (season !== null && episode !== null) {
            url += `?s=${season}&e=${episode}`;
        }
        return { ...provider, url };
    });

    const scrapePromises = providerUrls.map(async (provider) => {
        const startTime = Date.now();
        try {
            const response = await fetchStreamWithTimeout(provider.url);
            const html = response.data;
            
            let streamUrl = null;
            // Try to extract m3u8 first
            streamUrl = extractM3U8FromHTML(html);
            if (!streamUrl) {
                // If no m3u8, try to get embed URL
                const embedUrl = extractEmbedURL(html);
                if (embedUrl) {
                    streamUrl = embedUrl;
                }
            }

            return {
                provider: provider.name,
                url: streamUrl,
                latency: Date.now() - startTime,
                success: !!streamUrl,
                type: provider.type,
                priority: provider.priority
            };
        } catch (error) {
            return {
                provider: provider.name,
                url: null,
                latency: Date.now() - startTime,
                success: false,
                error: error.message,
                priority: provider.priority
            };
        }
    });

    const results = await Promise.allSettled(scrapePromises);
    
    const successfulStreams = results
        .filter(result => result.status === 'fulfilled' && result.value.success && result.value.url)
        .map(result => result.value)
        .sort((a, b) => a.latency - b.latency);

    if (successfulStreams.length > 0) {
        await redis.setex(cacheKey, 300, JSON.stringify({
            streams: successfulStreams,
            timestamp: Date.now()
        }));
    }

    return successfulStreams;
}

// ==================== API ENDPOINTS ====================

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/stream', async (req, res) => {
    try {
        const { tmdbId, season, episode, type = 'movie' } = req.body;
        
        if (!tmdbId) {
            return res.status(400).json({ error: 'TMDB ID is required' });
        }

        const parsedTmdbId = parseInt(tmdbId);
        if (isNaN(parsedTmdbId)) {
            return res.status(400).json({ error: 'Invalid TMDB ID' });
        }

        const streams = await scrapeStreams(
            parsedTmdbId,
            season ? parseInt(season) : null,
            episode ? parseInt(episode) : null,
            type
        );

        if (streams.length === 0) {
            return res.status(404).json({ 
                error: 'No streams found for this content' 
            });
        }

        res.json({
            success: true,
            streams: streams,
            bestStream: streams[0],
            totalProviders: streams.length
        });

    } catch (error) {
        console.error('Stream API error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch streams',
            details: error.message 
        });
    }
});

app.get('/api/search', async (req, res) => {
    try {
        const { query, type = 'multi', page = 1 } = req.query;
        
        if (!query || query.length < 2) {
            return res.status(400).json({ error: 'Search query too short' });
        }

        const cacheKey = `search:${query}:${type}:${page}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const response = await axios.get(`${TMDB_BASE_URL}/search/${type}`, {
            params: {
                api_key: TMDB_API_KEY,
                query: query,
                page: page,
                include_adult: false
            }
        });

        await redis.setex(cacheKey, 600, JSON.stringify(response.data));
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

app.get('/api/trending', async (req, res) => {
    try {
        const { time_window = 'week', media_type = 'all' } = req.query;
        
        const cacheKey = `trending:${time_window}:${media_type}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const response = await axios.get(`${TMDB_BASE_URL}/trending/${media_type}/${time_window}`, {
            params: { api_key: TMDB_API_KEY }
        });

        await redis.setex(cacheKey, 3600, JSON.stringify(response.data));
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trending' });
    }
});

app.get('/api/movie/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `movie:${id}`;
        
        const cached = await redis.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const response = await axios.get(`${TMDB_BASE_URL}/movie/${id}`, {
            params: {
                api_key: TMDB_API_KEY,
                append_to_response: 'videos,credits,similar'
            }
        });

        await redis.setex(cacheKey, 86400, JSON.stringify(response.data));
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
});

app.get('/api/tv/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `tv:${id}`;
        
        const cached = await redis.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const response = await axios.get(`${TMDB_BASE_URL}/tv/${id}`, {
            params: {
                api_key: TMDB_API_KEY,
                append_to_response: 'videos,credits,similar'
            }
        });

        await redis.setex(cacheKey, 86400, JSON.stringify(response.data));
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch TV details' });
    }
});

app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Cinemastream Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await redis.quit();
    process.exit(0);
});

module.exports = app;
