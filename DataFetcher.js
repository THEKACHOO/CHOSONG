class DataFetcher {
    constructor() {
    }

    /**
     * Searches for songs on Last.fm
     *
     * @private
     * @param {string} name
     * @param {number} limit
     * @returns {Song[]} an array of Song objects
     */
    async getSongInfos(name, limit = 1) {
        const query = name;

        const apiKey = '2b9803b8aca22fbb5ae178eef31b9b02';
        const searchUrl = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${apiKey}&format=json&limit=${limit}`;

        const response = await fetch(searchUrl);

        const result = await response.json();
        const tracks = result?.results?.trackmatches?.track || [];

        const songs = await Promise.all(tracks.map(async (searchTrack) => {
            try {
                const infoUrl = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${apiKey}&artist=${encodeURIComponent(searchTrack.artist)}&track=${encodeURIComponent(searchTrack.name)}&format=json`;
                const infoResponse = await fetch(infoUrl, {
                    headers: {
                        'User-Agent': 'Application LyricPost/1.0 (ohkachoo@gmail.com)',
                    },
                });
                const infoResult = await infoResponse.json();

                if (infoResult.track) {
                    return new Song(infoResult.track);
                }
            } catch (err) {
                console.error('Failed to fetch track info for', searchTrack.name, err);
            }
            return null;
        }));

        return songs.filter(song => song !== null);
    }

    /**
     * Gets a single track by Last.fm track MBID
     *
     * @private
     * @param {string} mbid
     * @returns {Song|null} a Song object
     */
    async getTrackById(mbid) {
        const apiKey = '2b9803b8aca22fbb5ae178eef31b9b02';
        const requestUrl = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${apiKey}&mbid=${mbid}&format=json`;

        const response = await fetch(requestUrl, {
            headers: {
                'User-Agent': 'Application LyricPost/1.0 (ohkachoo@gmail.com)',
            },
        });

        if (!response.ok) return null;
        const result = await response.json();

        if (result.track) {
            return new Song(result.track);
        }

        return null;
    }

    /**
     * Searches for song lyrics from multiple sources
     * Priority: lrclib.net → AZLyrics → Genius → Musixmatch
     *
     * @private
     * @param {string} artistName
     * @param {string} trackName
     * @returns {object} song lyrics object
     */
    async getSongLyrics(artistName, trackName) {
        try {
            // FIRST: Try lrclib.net (main API)
            const response = await fetch(
                `https://lrclib.net/api/search?q=${artistName} ${trackName}`,
                {
                    method: "GET",
                }
            );

            const result = await response.json();

            const filteredResult = result.filter(
                (data) =>
                    data.trackName.toLowerCase().trim() ===
                    trackName.toLowerCase().trim()
            );

            const lyrics = filteredResult[0] ?? result[0] ?? null;
            
            // If found, return immediately
            if (lyrics && lyrics.plainLyrics) {
                return lyrics;
            }
            
            // SECOND: If lrclib fails, try Google fallback
            console.log("lrclib failed, trying Google fallback...");
            return await this.getLyricsFromGoogle(artistName, trackName);
            
        } catch (error) {
            // THIRD: If error, try Google fallback
            console.log("lrclib error, trying Google fallback...");
            return await this.getLyricsFromGoogle(artistName, trackName);
        }
    }

    /**
     * FALLBACK: Search lyrics from Google sources
     * Tries AZLyrics, Genius, and Musixmatch simultaneously
     *
     * @private
     * @param {string} artistName
     * @param {string} trackName
     * @returns {object} song lyrics object
     */
    async getLyricsFromGoogle(artistName, trackName) {
        try {
            // Try all 3 sources at once (race)
            const sources = [
                this.fetchLyricsFromAZLyrics(artistName, trackName),
                this.fetchLyricsFromGenius(artistName, trackName),
                this.fetchLyricsFromMusixmatch(artistName, trackName)
            ];
            
            // Get the first one that succeeds (with 8 second timeout)
            const result = await Promise.race([
                Promise.any(sources),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 8000)
                )
            ]);
            
            if (result) {
                return {
                    plainLyrics: result,
                    syncedLyrics: null
                };
            }
            
            throw new Error('No lyrics found from Google');
            
        } catch (error) {
            console.error('Google fallback failed:', error);
            return null;
        }
    }

    /**
     * Scrape lyrics from AZLyrics
     *
     * @private
     * @param {string} artistName
     * @param {string} trackName
     * @returns {string} lyrics text
     */
    async fetchLyricsFromAZLyrics(artistName, trackName) {
        try {
            const formattedArtist = artistName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const formattedTrack = trackName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const url = `https://www.azlyrics.com/lyrics/${formattedArtist}/${formattedTrack}.html`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            
            if (!response.ok) throw new Error('AZLyrics not found');
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const lyricsDiv = doc.querySelector('.ringtone')?.nextElementSibling || 
                             doc.querySelector('.col-xs-12.col-lg-8.text-center');
            
            if (lyricsDiv) {
                const lyricsText = lyricsDiv.textContent
                    .replace(/\[.*?\]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                    
                if (lyricsText.length > 50) {
                    return lyricsText;
                }
            }
            
            throw new Error('Lyrics not found in AZLyrics');
            
        } catch (error) {
            console.log('AZLyrics failed:', error.message);
            throw error;
        }
    }

    /**
     * Scrape lyrics from Genius
     *
     * @private
     * @param {string} artistName
     * @param {string} trackName
     * @returns {string} lyrics text
     */
    async fetchLyricsFromGenius(artistName, trackName) {
        try {
            const formattedArtist = artistName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const formattedTrack = trackName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const url = `https://genius.com/${formattedArtist}-${formattedTrack}-lyrics`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            
            if (!response.ok) throw new Error('Genius not found');
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const lyricsContainer = doc.querySelector('[data-lyrics-container="true"]');
            
            if (lyricsContainer) {
                const lyricsText = lyricsContainer.textContent
                    .replace(/\[.*?\]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                    
                if (lyricsText.length > 50) {
                    return lyricsText;
                }
            }
            
            throw new Error('Lyrics not found in Genius');
            
        } catch (error) {
            console.log('Genius failed:', error.message);
            throw error;
        }
    }

    /**
     * Scrape lyrics from Musixmatch
     *
     * @private
     * @param {string} artistName
     * @param {string} trackName
     * @returns {string} lyrics text
     */
    async fetchLyricsFromMusixmatch(artistName, trackName) {
        try {
            const formattedArtist = artistName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const formattedTrack = trackName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const url = `https://www.musixmatch.com/lyrics/${formattedArtist}/${formattedTrack}`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            
            if (!response.ok) throw new Error('Musixmatch not found');
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const lyricsDiv = doc.querySelector('.mxm-lyrics') || 
                             doc.querySelector('.lyrics__content__ok');
            
            if (lyricsDiv) {
                const lyricsText = lyricsDiv.textContent
                    .replace(/\[.*?\]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                    
                if (lyricsText.length > 50) {
                    return lyricsText;
                }
            }
            
            throw new Error('Lyrics not found in Musixmatch');
            
        } catch (error) {
            console.log('Musixmatch failed:', error.message);
            throw error;
        }
    }
}
