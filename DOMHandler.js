const SONGS_TO_FETCH = 6;
const SELECTION_ANIMATION_DELAY = 300;
const NEXT_LINE_ANIMATION_DELAY = 30;
const SEARCHING_FOR_SONG = "Searching for your song...";
const SEARCHING_FOR_LYRICS = "Searching for song's lyrics...";
const DOWNLOADING = "Downloading lyrics image...";
const NO_LYRICS_FOUND = "No lyrics found<br>You can still type your own lyrics by clicking here :)";
const NO_LYRICS_SELECTED = "No lyrics selected<br>You can still type your own lyrics by clicking here :)";

// WARNA
const COLORS = [
    "#ffffff",
    "#2e2928",
    "#ffa9a3",
    "#cc0e00",
    "#83b8fc",
    "#fcd683",
    "#b5ffc0",
];

// TIMEOUT UNTUK REQUEST LIRIK (5 detik)
const LYRICS_TIMEOUT = 5000;

class DOMHandler {
    constructor(fetcher) {
        this.fetcher = fetcher;
        this.songs = [];
        this.selectedSongIndex = null;
        this.usedDirectLink = false;
        this.isLoadingLyrics = false;

        // DOM Elements
        this.errorTexts = document.querySelectorAll(".error");
        this.searchingTexts = document.querySelectorAll(".searching");
        this.screens = document.querySelectorAll(".lyrics-image-screen");

        this.searchInput = document.querySelector("#song-name");
        this.searchButton = document.querySelector("#search");
        this.spotifyLinkInput = document.querySelector("#spotify-link");
        this.loadLinkButton = document.querySelector("#load-link");

        this.cloneableSelectSong = document.querySelector(".select-song.cloneable");
        this.songSelection = document.querySelector(".song-selection");
        this.lineSelection = document.querySelector(".lines-selection");
        this.songInfoCover = document.querySelector(".song-info-cover");
        this.songInfoName = document.querySelector(".song-info-name");
        this.songInfoArtist = document.querySelector(".song-info-artist");

        // Screen 4 Elements
        this.lastGoBack = document.querySelector("#last-go-back");
        this.downloadButton = document.querySelector("#download");
        this.colorSelection = document.querySelector(".color-selection");
        this.customColorInput = document.querySelector("#custom-color-input");
        this.lightTextSwitch = document.querySelector("#light-text");
        this.additionalBgSwitch = document.querySelector("#additional-bg");
        this.songImage = document.querySelector(".song-image");
        this.widthSlider = document.querySelector("#width-slider");
        this.widthValue = document.querySelector("#width-value");
        this.fileInput = document.querySelector(".song-image .file-input");
        this.albumImageWrapper = document.querySelector(".song-image .album-image-wrapper");
        this.screen4AlbumImg = document.querySelector(".song-image .screen4-album-img");

        this.setListeners();
        this.populateColorSelection();
    }

    setListeners() {
        // Screen 1
        this.searchButton.addEventListener("click", (e) => {
            e.preventDefault();
            this.findSong();
        });

        this.loadLinkButton.addEventListener("click", (e) => {
            e.preventDefault();
            this.loadFromSpotifyLink();
        });

        // Screen 2 - back button
        const backToSearch = document.querySelector("#back-to-search");
        if (backToSearch) {
            backToSearch.addEventListener("click", () => {
                this.displayScreen(1);
            });
        }

        // Screen 3 - back and next
        const backLine = document.querySelector("#back-line");
        if (backLine) {
            backLine.addEventListener("click", () => {
                this.displayScreen(2);
            });
        }

        const nextLine = document.querySelector("#next-line");
        if (nextLine) {
            nextLine.addEventListener("click", () => {
                const selectedLines = document.querySelectorAll(".select-line.selected");
                if (selectedLines.length > 0) {
                    this.displaySongImage();
                } else {
                    alert("Please select at least one line first!");
                }
            });
        }

        // Screen 4
        if (this.lastGoBack) {
            this.lastGoBack.addEventListener("click", () => {
                this.displayScreen(3);
            });
        }

        if (this.customColorInput) {
            this.customColorInput.addEventListener("input", (e) => {
                this.setSongImageColor(e.target.value);
            });
        }

        if (this.lightTextSwitch) {
            this.lightTextSwitch.addEventListener("click", () => {
                this.lightTextSwitch.classList.toggle("active");
                this.toggleLightText();
            });
        }

        if (this.additionalBgSwitch) {
            this.additionalBgSwitch.addEventListener("click", () => {
                this.additionalBgSwitch.classList.toggle("active");
                this.toggleAdditionalBg();
            });
        }

        if (this.downloadButton) {
            this.downloadButton.addEventListener("click", () => {
                this.downloadSongImage();
            });
        }

        if (this.widthSlider) {
            this.widthSlider.addEventListener("input", (e) => {
                const width = e.target.value;
                this.setSongImageWidth(width);
                if (this.widthValue) {
                    this.widthValue.textContent = `${width}px`;
                }
            });
        }

        // Upload foto
        if (this.fileInput) {
            this.fileInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.uploadAlbumImage(file);
                }
            });
        }

        // Contenteditable paste as plain text
        document.querySelectorAll("[contenteditable]").forEach((field) => {
            field.addEventListener("paste", function(e) {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                document.execCommand("insertText", false, text);
            });
        });
    }

    // ========== FIND LYRICS DENGAN FALLBACK GOOGLE ==========
    async findLyrics() {
        if (this.isLoadingLyrics) return;
        this.isLoadingLyrics = true;

        this.lineSelection.innerHTML = "";
        this.displayScreen(3);
        this.displaySongInfo();
        this.displaySearching(SEARCHING_FOR_LYRICS);

        const song = this.songs[this.selectedSongIndex];
        const artists = song.artists.map(a => a.name);
        let lyrics = null;

        try {
            // Coba dengan artist pertama
            const firstArtist = artists[0];
            if (firstArtist) {
                try {
                    const result = await this.fetchWithTimeout(
                        this.fetcher.getSongLyrics(firstArtist, song.name),
                        LYRICS_TIMEOUT
                    );
                    if (result && result.plainLyrics) {
                        lyrics = result;
                    }
                } catch (e) {
                    console.log(`First artist "${firstArtist}" not found, trying others...`);
                }
            }

            // Jika tidak ditemukan, coba artist lain
            if (!lyrics && artists.length > 1) {
                const remainingArtists = artists.slice(1);
                const promises = remainingArtists.map(artist => 
                    this.fetchWithTimeout(
                        this.fetcher.getSongLyrics(artist, song.name),
                        LYRICS_TIMEOUT
                    ).catch(() => null)
                );
                
                const results = await Promise.all(promises);
                for (const result of results) {
                    if (result && result.plainLyrics) {
                        lyrics = result;
                        break;
                    }
                }
            }

            if (lyrics === null) throw Error("Lyrics not found");
            
        } catch (error) {
            console.error("Lyrics fetch error:", error);
            this.hideSearching();
            this.isLoadingLyrics = false;
            
            // Tampilkan pesan tidak ada lirik
            const noLyricsMsg = document.createElement("div");
            noLyricsMsg.classList.add("no-lyrics-message");
            noLyricsMsg.innerHTML = "❌ No lyrics found.<br>You can type your own lyrics in the next step.";
            noLyricsMsg.style.padding = "20px";
            noLyricsMsg.style.textAlign = "center";
            noLyricsMsg.style.fontSize = "0.9rem";
            noLyricsMsg.style.color = "var(--text-gray)";
            this.lineSelection.append(noLyricsMsg);
            
            song.lyrics = [];
            this.isLoadingLyrics = false;
            return;
        }

        this.hideSearching();
        this.isLoadingLyrics = false;
        song.loadLyrics(lyrics);
        this.populateLineSelection();
    }

    // ========== FUNGSI FETCH DENGAN TIMEOUT ==========
    fetchWithTimeout(promise, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Request timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            
            promise
                .then(result => {
                    clearTimeout(timeoutId);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }

    // ========== SISANYA SAMA ==========
    uploadAlbumImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = Math.min(img.width, img.height);
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                const sx = (img.width - size) / 2;
                const sy = (img.height - size) / 2;
                ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
                
                const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                if (this.screen4AlbumImg) {
                    this.screen4AlbumImg.src = croppedDataUrl;
                    this.screen4AlbumImg.style.display = 'block';
                }
                if (this.albumImageWrapper) {
                    this.albumImageWrapper.style.backgroundImage = `url(${croppedDataUrl})`;
                    this.albumImageWrapper.style.backgroundSize = 'cover';
                    this.albumImageWrapper.style.backgroundPosition = 'center';
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        this.fileInput.value = '';
    }

    populateColorSelection() {
        if (!this.colorSelection) return;
        this.colorSelection.querySelectorAll('.select-color:not(#custom-color)').forEach(el => el.remove());

        COLORS.forEach((color) => {
            const element = document.createElement("div");
            element.classList.add("select-color");
            element.style.backgroundColor = color;
            if (color === "#ffffff") {
                element.style.border = "2px solid #ccc";
            }
            element.textContent = ".";
            element.style.color = "transparent";

            element.addEventListener("click", () => {
                this.setSongImageColor(color);
                if (this.customColorInput) {
                    this.customColorInput.value = color;
                }
            });

            this.colorSelection.insertBefore(
                element,
                this.colorSelection.querySelector("#custom-color")
            );
        });
    }

    async loadFromSpotifyLink() {
        const url = this.spotifyLinkInput.value.trim();
        if (url === "") {
            return this.throwError("Please paste a Spotify link!");
        }

        const trackId = this.fetcher.parseSpotifyUrl(url);
        if (!trackId) {
            return this.throwError("Invalid Spotify link. Try the Search tab instead!");
        }

        this.spotifyLinkInput.disabled = true;
        this.loadLinkButton.disabled = true;

        this.hideError();
        this.displaySearching("Loading song from Spotify...");

        try {
            const song = await this.fetcher.getTrackById(trackId);
            this.songs = [song];
            this.selectedSongIndex = 0;
            this.usedDirectLink = true;
            await this.findLyrics();
        } catch (error) {
            console.error(error);
            this.throwError("Couldn't load that song. Check the link and try again!");
        }

        this.hideSearching();
        this.spotifyLinkInput.disabled = false;
        this.loadLinkButton.disabled = false;
    }

    async findSong() {
        const name = this.searchInput.value.trim();
        if (name === "") {
            return this.throwError("Hold on! Haven't you forgotten about something?");
        }

        this.searchInput.disabled = true;
        this.searchButton.disabled = true;

        this.hideError();
        this.displaySearching(SEARCHING_FOR_SONG);

        try {
            this.songs = await this.fetcher.getSongInfos(name, SONGS_TO_FETCH);
            this.usedDirectLink = false;
            this.populateSongSelection();
            this.displayScreen(2);
        } catch (error) {
            console.error(error);
            this.throwError(`Oops! Looks like we couldn't find any songs for "${name}".`);
        }

        this.hideSearching();
        this.searchInput.disabled = false;
        this.searchButton.disabled = false;
    }

    populateSongSelection() {
        if (!this.songSelection) return;
        this.songSelection.querySelectorAll(".select-song:not(.cloneable)").forEach(el => el.remove());

        this.songs.forEach((song, index) => {
            const clone = this.cloneableSelectSong.cloneNode(true);
            clone.querySelector("img").src = song.albumCoverUrl;
            clone.querySelector(".name").textContent = song.name;
            clone.querySelector(".authors").textContent = song.artists.map(a => a.name).join(", ");

            clone.addEventListener("click", () => {
                this.selectedSongIndex = index;
                this.findLyrics();
            });

            clone.classList.remove("cloneable");
            this.songSelection.append(clone);
        });

        setTimeout(() => {
            this.songSelection.classList.remove("hidden");
        }, SELECTION_ANIMATION_DELAY);
    }

    displaySongInfo() {
        const song = this.songs[this.selectedSongIndex];
        if (this.songInfoCover) this.songInfoCover.src = song.albumCoverUrl;
        if (this.songInfoName) this.songInfoName.textContent = song.name;
        if (this.songInfoArtist) this.songInfoArtist.textContent = song.artists.map(a => a.name).join(", ");
    }

    populateLineSelection() {
        let animationDelay = SELECTION_ANIMATION_DELAY;
        const lyrics = this.songs[this.selectedSongIndex].lyrics;

        if (!lyrics || lyrics.length === 0) {
            const noLyricsMsg = document.createElement("div");
            noLyricsMsg.classList.add("no-lyrics-message");
            noLyricsMsg.innerHTML = "📝 No lyrics found.<br>You can type your own lyrics in the next step.";
            noLyricsMsg.style.padding = "20px";
            noLyricsMsg.style.textAlign = "center";
            noLyricsMsg.style.fontSize = "0.9rem";
            noLyricsMsg.style.color = "var(--text-gray)";
            this.lineSelection.append(noLyricsMsg);
            return;
        }

        lyrics.forEach((line, index) => {
            const element = document.createElement("div");
            element.classList.add("select-line", "hidden");
            element.textContent = line.text;
            element.dataset.index = index;

            element.addEventListener("click", () => {
                element.classList.toggle("selected");
            });

            setTimeout(() => {
                element.classList.remove("hidden");
            }, animationDelay);

            animationDelay += NEXT_LINE_ANIMATION_DELAY;
            this.lineSelection.append(element);
        });
    }

    displaySongImage() {
        this.setSongImage();
        this.displayScreen(4);
        
        if (this.widthSlider) {
            this.setSongImageWidth(this.widthSlider.value);
            if (this.widthValue) {
                this.widthValue.textContent = `${this.widthSlider.value}px`;
            }
        }
    }

    setSongImage() {
        const song = this.songs[this.selectedSongIndex];
        
        if (this.screen4AlbumImg && song.albumCoverUrl) {
            this.screen4AlbumImg.src = song.albumCoverUrl;
            this.screen4AlbumImg.style.display = 'block';
            if (this.albumImageWrapper) {
                this.albumImageWrapper.style.backgroundImage = `url(${song.albumCoverUrl})`;
                this.albumImageWrapper.style.backgroundSize = 'cover';
                this.albumImageWrapper.style.backgroundPosition = 'center';
            }
        }
        
        const nameDiv = document.querySelector(".song-image .header .name");
        const authorsDiv = document.querySelector(".song-image .header .authors");
        if (nameDiv) nameDiv.textContent = song.name;
        if (authorsDiv) authorsDiv.textContent = song.artists.map(a => a.name).join(", ");
        
        const selectedLines = document.querySelectorAll(".select-line.selected");
        let lyricsHtml = '';
        if (selectedLines.length > 0) {
            Array.from(selectedLines).forEach(line => {
                let lineText = line.textContent.trim();
                if (lineText) {
                    lyricsHtml += `<div class="lyric-line">${lineText}</div>`;
                }
            });
        } else {
            const song = this.songs[this.selectedSongIndex];
            if (song.lyrics && song.lyrics.length > 0) {
                song.lyrics.forEach(lyric => {
                    if (lyric.text.trim()) {
                        lyricsHtml += `<div class="lyric-line">${lyric.text}</div>`;
                    }
                });
            }
        }
        
        const lyricsDiv = document.querySelector(".song-image .lyrics");
        if (lyricsDiv) lyricsDiv.innerHTML = lyricsHtml || NO_LYRICS_SELECTED;
        
        const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.setSongImageColor(randomColor);
        if (this.customColorInput) {
            this.customColorInput.value = randomColor;
        }
    }

    setSongImageColor(color) {
        if (this.songImage) {
            const bgToggle = document.getElementById("additional-bg");
            if (bgToggle && bgToggle.classList.contains("active")) {
                this.songImage.style.background = `linear-gradient(135deg, ${color}, #ffffff)`;
                this.songImage.style.backgroundColor = "";
            } else {
                this.songImage.style.backgroundColor = color;
                this.songImage.style.backgroundImage = "";
            }
        }
    }

    setSongImageWidth(width) {
        if (this.songImage) {
            this.songImage.style.width = `${width}px`;
        }
    }

    toggleLightText() {
        const isActive = this.lightTextSwitch.classList.contains("active");
        const nameDiv = document.querySelector(".song-image .header .name");
        const authorsDiv = document.querySelector(".song-image .header .authors");
        const lyricsDiv = document.querySelector(".song-image .lyrics");
        
        if (isActive) {
            if (nameDiv) nameDiv.style.color = "#ffffff";
            if (authorsDiv) authorsDiv.style.color = "#ffffff";
            if (lyricsDiv) lyricsDiv.style.color = "#ffffff";
        } else {
            if (nameDiv) nameDiv.style.color = "";
            if (authorsDiv) authorsDiv.style.color = "";
            if (lyricsDiv) lyricsDiv.style.color = "";
        }
    }

    toggleAdditionalBg() {
        const currentColor = this.customColorInput ? this.customColorInput.value : "#000000";
        if (this.additionalBgSwitch.classList.contains("active")) {
            this.songImage.style.background = `linear-gradient(135deg, ${currentColor}, #ffffff)`;
            this.songImage.style.backgroundColor = "";
        } else {
            this.songImage.style.backgroundColor = currentColor;
            this.songImage.style.backgroundImage = "";
        }
    }

    async downloadSongImage() {
        this.displaySearching(DOWNLOADING);
        const song = this.songs[this.selectedSongIndex];
        const downloadName = `${song.artists.map(a => a.name).join(", ")} - ${song.name}.png`;

        try {
            const canvas = await html2canvas(this.songImage, {
                scale: 2,
                backgroundColor: null,
                useCORS: true,
                allowTaint: false
            });
            
            canvas.toBlob((blob) => {
                saveAs(blob, downloadName);
                this.hideSearching();
            });
        } catch (error) {
            console.error(error);
            this.hideSearching();
            alert("Failed to download image");
        }
    }

    throwError(html) {
        this.errorTexts.forEach(el => {
            el.innerHTML = html;
            el.classList.remove("hidden");
        });
    }

    hideError() {
        this.errorTexts.forEach(el => el.classList.add("hidden"));
    }

    displaySearching(text) {
        this.searchingTexts.forEach(el => {
            el.textContent = text;
            el.classList.remove("hidden");
        });
    }

    hideSearching() {
        this.searchingTexts.forEach(el => el.classList.add("hidden"));
    }

    displayScreen(number) {
        this.screens.forEach(screen => {
            const screenNumber = Number(screen.dataset.number);
            if (screenNumber === number) {
                screen.classList.remove("hidden");
            } else {
                screen.classList.add("hidden");
            }
        });
    }
}
