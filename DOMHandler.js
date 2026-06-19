const SONGS_TO_FETCH = 6;
const SELECTION_ANIMATION_DELAY = 300;
const NEXT_LINE_ANIMATION_DELAY = 30;
const SEARCHING_FOR_SONG = "Searching for your song...";
const SEARCHING_FOR_LYRICS = "Searching for song's lyrics...";
const DOWNLOADING = "Downloading lyrics image...";
const NO_LYRICS_FOUND = "No lyrics found<br>You can still type your own lyrics by clicking here :)";
const NO_LYRICS_SELECTED = "No lyrics selected<br>You can still type your own lyrics by clicking here :)";

// ========== INI SATU-SATUNYA YANG DIUBAH - WARNA BARU ==========
const COLORS = [
    "#ffffff",   // Putih
    "#2e2928",   // Coklat gelap
    "#ffa9a3",   // Peach/pink muda
    "#cc0e00",   // Merah
    "#83b8fc",   // Biru muda
    "#fcd683",   // Kuning
    "#b5ffc0",   // Hijau mint (BARU)
];
// ========== SAMPAI SINI ==========

class DOMHandler {
    constructor(fetcher) {
        this.fetcher = fetcher;
        this.songs = [];
        this.selectedSongIndex = null;
        this.usedDirectLink = false;

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

        // Contenteditable paste as plain text
        document.querySelectorAll("[contenteditable]").forEach((field) => {
            field.addEventListener("paste", function(e) {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                document.execCommand("insertText", false, text);
            });
        });

        // Dark mode toggle
        const darkModeToggle = document.querySelector("#dark-mode-toggle");
        if (darkModeToggle) {
            darkModeToggle.addEventListener("click", () => {
                document.body.classList.toggle("dark-mode");
                const isDark = document.body.classList.contains("dark-mode");
                const icon = darkModeToggle.querySelector(".material-symbols-outlined");
                if (icon) {
                    icon.textContent = isDark ? "dark_mode" : "light_mode";
                }
            });
        }
    }

    populateColorSelection() {
        if (!this.colorSelection) return;

        // Hapus warna lama
        this.colorSelection.querySelectorAll('.select-color:not(#custom-color)').forEach(el => el.remove());

        COLORS.forEach((color) => {
            const element = document.createElement("div");
            element.classList.add("select-color");
            element.style.backgroundColor = color;
            
            // Border untuk warna putih agar terlihat
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

    async findLyrics() {
        this.lineSelection.innerHTML = "";
        this.displayScreen(3);
        this.displaySongInfo();
        this.displaySearching(SEARCHING_FOR_LYRICS);

        const song = this.songs[this.selectedSongIndex];
        const artists = song.artists.map(a => a.name);
        let lyrics = null;
        let currentArtist = 0;

        try {
            while (lyrics === null && artists.length > currentArtist) {
                lyrics = await this.fetcher.getSongLyrics(artists[currentArtist], song.name);
                currentArtist++;
            }
            if (lyrics === null) throw Error("Lyrics not found");
        } catch (error) {
            this.hideSearching();
            if (document.querySelector(".final-options").classList.contains("hidden")) {
                this.displaySongImage();
            }
            return console.error(error);
        }

        this.hideSearching();
        song.loadLyrics(lyrics);
        this.populateLineSelection();
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
        
        const screen4Img = document.querySelector(".song-image .header .screen4-album-img");
        if (screen4Img && song.albumCoverUrl) {
            screen4Img.src = song.albumCoverUrl;
        }
        
        const nameDiv = document.querySelector(".song-image .header .name");
        const authorsDiv = document.querySelector(".song-image .header .authors");
        if (nameDiv) nameDiv.textContent = song.name;
        if (authorsDiv) authorsDiv.textContent = song.artists.map(a => a.name).join(", ");
        
        const selectedLines = document.querySelectorAll(".select-line.selected");
        let lyricsHtml = '';
        Array.from(selectedLines).forEach(line => {
            let lineText = line.textContent.trim();
            if (lineText) {
                lyricsHtml += `<div class="lyric-line">${lineText}</div>`;
            }
        });
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
