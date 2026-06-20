const SONGS_TO_FETCH = 6;
const SELECTION_ANIMATION_DELAY = 300;
const NEXT_LINE_ANIMATION_DELAY = 30;
const SEARCHING_FOR_SONG = "Searching for your song...";
const SEARCHING_FOR_LYRICS = "Searching for song's lyrics...";
const DOWNLOADING = "Downloading lyrics image...";
const NO_LYRICS_FOUND = "No lyrics found<br>You can still type your own lyrics by clicking here :)";
const NO_LYRICS_SELECTED = "No lyrics selected<br>You can still type your own lyrics by clicking here :)";

// WARNA BARU
const COLORS = [
    "#ffffff",
    "#2e2928",
    "#ffa9a3",
    "#cc0e00",
    "#83b8fc",
    "#fcd683",
    "#b5ffc0",
];

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
        
        // Upload foto album
        this.fileInput = document.querySelector(".song-image .file-input");
        this.albumImageWrapper = document.querySelector(".song-image .album-image-wrapper");
        this.screen4AlbumImg = document.querySelector(".song-image .screen4-album-img");

        // ========== BACKGROUND MODAL REFS ==========
        this.bgModal = document.querySelector('#background-modal');
        this.bgModalOverlay = document.querySelector('#background-modal-overlay');
        this.bgModalClose = document.querySelector('#background-modal-close');
        this.bgOpenBtn = document.querySelector('#open-background-modal');
        this.bgCanvasContainer = document.querySelector('#bg-canvas-container');
        this.bgSongOverlay = document.querySelector('#bg-song-overlay');
        this.bgImage = document.querySelector('#bg-canvas-image');
        this.bgDownloadBtn = document.querySelector('#bg-download-btn');
        this.bgZoomSlider = document.querySelector('#bg-zoom-slider');
        this.bgZoomLabel = document.querySelector('#bg-zoom-label');
        this.bgUploadInput = document.querySelector('#bg-upload-input');

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
                // Sync ke modal jika terbuka
                if (this.bgModal && this.bgModal.classList.contains('open')) {
                    this.updateBgOverlay();
                }
            });
        }

        // Upload foto album
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

        // ========== BACKGROUND MODAL LISTENERS ==========
        if (this.bgOpenBtn) {
            this.bgOpenBtn.addEventListener('click', () => {
                this.openBackgroundModal();
            });
        }

        if (this.bgModalClose) {
            this.bgModalClose.addEventListener('click', () => {
                this.closeBackgroundModal();
            });
        }

        if (this.bgModalOverlay) {
            this.bgModalOverlay.addEventListener('click', () => {
                this.closeBackgroundModal();
            });
        }

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.bgModal && this.bgModal.classList.contains('open')) {
                this.closeBackgroundModal();
            }
        });

        // Background controls
        this.bgButtons = document.querySelectorAll('[data-bg]');

        this.bgButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.bgButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateBgCanvas();
            });
        });

        // ZOOM SLIDER
        if (this.bgZoomSlider) {
            this.bgZoomSlider.addEventListener('input', () => {
                const val = this.bgZoomSlider.value;
                this.bgZoomLabel.textContent = val + '%';
                if (this.bgSongOverlay) {
                    this.bgSongOverlay.style.transform = `translate(-50%, -50%) scale(${val / 100})`;
                }
            });
        }

        if (this.bgUploadInput) {
            this.bgUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    this.bgImage.src = ev.target.result;
                    this.bgImage.style.display = 'block';
                    this.bgCanvasContainer.style.backgroundColor = 'transparent';
                    this.bgButtons.forEach(b => b.classList.remove('active'));
                    const photoBtn = document.querySelector('.bg-upload-btn');
                    if (photoBtn) photoBtn.classList.add('active');
                };
                reader.readAsDataURL(file);
                this.bgUploadInput.value = '';
            });
        }

        if (this.bgDownloadBtn) {
            this.bgDownloadBtn.addEventListener('click', () => {
                this.downloadBackground();
            });
        }
    }

    // ========== UPLOAD FOTO ALBUM ==========
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

    // ========== POPULATE COLOR ==========
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

    // ========== BACKGROUND MODAL METHODS ==========
    openBackgroundModal() {
        if (!this.bgModal) return;
        this.bgModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        
        // Update overlay - PASTIKAN SAMA PERSIS DENGAN SCREEN 4
        this.updateBgOverlay();
        this.updateBgCanvas();
        
        // Reset zoom ke 100%
        if (this.bgZoomSlider) {
            this.bgZoomSlider.value = '100';
            this.bgZoomLabel.textContent = '100%';
            if (this.bgSongOverlay) {
                this.bgSongOverlay.style.transform = 'translate(-50%, -50%) scale(1)';
            }
        }
    }

    closeBackgroundModal() {
        if (!this.bgModal) return;
        this.bgModal.classList.remove('open');
        document.body.style.overflow = '';
    }

    updateBgOverlay() {
        if (!this.bgSongOverlay) return;
        const source = document.querySelector('#song-image-container');
        if (source) {
            // Clone source - SAMA PERSIS TANPA DIUBAH
            const clone = source.cloneNode(true);
            
            // Hapus file input biar ga ke-click
            const fileInput = clone.querySelector('.file-input');
            if (fileInput) fileInput.remove();
            
            // Matikan contenteditable
            clone.querySelectorAll('[contenteditable]').forEach(el => {
                el.contentEditable = 'false';
            });
            
            // JANGAN UBAH STYLE APA PUN - biarkan persis seperti aslinya
            // Hanya pastikan width sesuai screen 4
            const songImage = clone.querySelector('.song-image');
            if (songImage) {
                const screen4Width = this.widthSlider ? this.widthSlider.value : 320;
                songImage.style.width = screen4Width + 'px';
                songImage.style.maxWidth = '100%';
                // Biarkan style lain tetap dari aslinya
            }
            
            this.bgSongOverlay.innerHTML = '';
            this.bgSongOverlay.appendChild(clone);
            
            // Atur posisi overlay
            this.bgSongOverlay.style.position = 'absolute';
            this.bgSongOverlay.style.top = '50%';
            this.bgSongOverlay.style.left = '50%';
            this.bgSongOverlay.style.zIndex = '2';
            this.bgSongOverlay.style.padding = '0';
            this.bgSongOverlay.style.background = 'transparent';
            this.bgSongOverlay.style.width = 'auto';
            this.bgSongOverlay.style.maxWidth = '90%';
            this.bgSongOverlay.style.pointerEvents = 'none';
            
            // Zoom
            if (this.bgZoomSlider) {
                const val = this.bgZoomSlider.value;
                this.bgSongOverlay.style.transform = `translate(-50%, -50%) scale(${val / 100})`;
            } else {
                this.bgSongOverlay.style.transform = 'translate(-50%, -50%) scale(1)';
            }
        }
    }

    updateBgCanvas() {
        const activeBg = document.querySelector('[data-bg].active');
        if (!activeBg) return;
        const bg = activeBg.dataset.bg;
        if (bg === 'white') {
            this.bgImage.style.display = 'none';
            this.bgCanvasContainer.style.backgroundColor = '#ffffff';
            this.bgImage.src = '';
        } else if (bg === 'black') {
            this.bgImage.style.display = 'none';
            this.bgCanvasContainer.style.backgroundColor = '#000000';
            this.bgImage.src = '';
        }
    }

    // ========== DOWNLOAD BACKGROUND (800x800) ==========
    async downloadBackground() {
        if (!this.bgDownloadBtn) return;
        const btn = this.bgDownloadBtn;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined">sync</span> Generating...';
        btn.disabled = true;
        
        try {
            const container = this.bgCanvasContainer;
            const targetSize = 800;
            const rect = container.getBoundingClientRect();
            
            // Clone container - SAMA PERSIS
            const clone = container.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = rect.width + 'px';
            clone.style.height = rect.height + 'px';
            clone.style.zIndex = '-9999';
            clone.style.transform = 'none';
            clone.style.borderRadius = '0';
            clone.style.overflow = 'hidden';
            document.body.appendChild(clone);
            
            // Pastikan background image terlihat
            const cloneImage = clone.querySelector('#bg-canvas-image');
            if (cloneImage) {
                cloneImage.style.display = 'block';
                cloneImage.style.position = 'absolute';
                cloneImage.style.top = '0';
                cloneImage.style.left = '0';
                cloneImage.style.width = '100%';
                cloneImage.style.height = '100%';
                cloneImage.style.objectFit = 'cover';
                cloneImage.style.zIndex = '1';
            }
            
            // Pastikan overlay card SAMA PERSIS - JANGAN UBAH STYLE CARD
            const cloneOverlay = clone.querySelector('.bg-song-overlay');
            if (cloneOverlay) {
                // Hanya atur posisi overlay, jangan ubah card di dalamnya
                cloneOverlay.style.position = 'absolute';
                cloneOverlay.style.top = '50%';
                cloneOverlay.style.left = '50%';
                cloneOverlay.style.transform = 'translate(-50%, -50%)';
                cloneOverlay.style.zIndex = '2';
                cloneOverlay.style.padding = '0';
                cloneOverlay.style.background = 'transparent';
                cloneOverlay.style.width = 'auto';
                cloneOverlay.style.maxWidth = '90%';
                cloneOverlay.style.pointerEvents = 'none';
                
                // JANGAN UBAH .song-image di dalamnya - biarkan apa adanya
                // Hanya pastikan width sesuai screen 4
                const songImg = cloneOverlay.querySelector('.song-image');
                if (songImg) {
                    const screen4Width = this.widthSlider ? this.widthSlider.value : 320;
                    songImg.style.width = screen4Width + 'px';
                    songImg.style.maxWidth = '100%';
                    songImg.style.margin = '0 auto';
                    // Biarkan semua style lain dari aslinya
                }
            }
            
            // Render
            const canvas = await html2canvas(clone, {
                scale: targetSize / rect.width,
                width: rect.width,
                height: rect.height,
                backgroundColor: null,
                useCORS: true,
                allowTaint: false,
                logging: false
            });
            
            document.body.removeChild(clone);
            
            // Buat canvas final 800x800
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = targetSize;
            finalCanvas.height = targetSize;
            const ctx = finalCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(canvas, 0, 0, targetSize, targetSize);
            
            finalCanvas.toBlob((blob) => {
                saveAs(blob, 'chosong-background.png');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 'image/png');
            
        } catch (err) {
            console.error('Download failed:', err);
            alert('Failed to download image. Please try again.');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // ========== LOAD FROM SPOTIFY ==========
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

    // ========== FIND SONG ==========
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

    // ========== POPULATE SONG SELECTION ==========
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

    // ========== FIND LYRICS ==========
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

    // ========== DISPLAY SONG INFO ==========
    displaySongInfo() {
        const song = this.songs[this.selectedSongIndex];
        if (this.songInfoCover) this.songInfoCover.src = song.albumCoverUrl;
        if (this.songInfoName) this.songInfoName.textContent = song.name;
        if (this.songInfoArtist) this.songInfoArtist.textContent = song.artists.map(a => a.name).join(", ");
    }

    // ========== POPULATE LINE SELECTION ==========
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

    // ========== DISPLAY SONG IMAGE ==========
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

    // ========== SET SONG IMAGE ==========
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

    // ========== SET SONG IMAGE COLOR ==========
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

    // ========== SET SONG IMAGE WIDTH ==========
    setSongImageWidth(width) {
        if (this.songImage) {
            this.songImage.style.width = `${width}px`;
        }
    }

    // ========== TOGGLE LIGHT TEXT ==========
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

    // ========== TOGGLE ADDITIONAL BG ==========
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

    // ========== DOWNLOAD SONG IMAGE ==========
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

    // ========== UTILITY ==========
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
