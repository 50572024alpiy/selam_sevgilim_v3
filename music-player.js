document.addEventListener('DOMContentLoaded', () => {
    const audio = new Audio();
    const playBtn = document.getElementById('playBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const trackTitle = document.getElementById('trackTitle');
    const trackStatus = document.getElementById('trackStatus');
    const volumeSlider = document.getElementById('volumeSlider');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const musicToggle = document.getElementById('musicToggle');
    const musicToggleImg = musicToggle ? musicToggle.querySelector('img') : null;
    const rightSidebar = document.querySelector('.right-sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (musicToggle && rightSidebar) {
        musicToggle.addEventListener('click', () => {
            rightSidebar.classList.toggle('active');
        });
    }
    const playlist = [
        { title: "1. epilogue", file: "songs/analog.mp3" },
        { title: "2. İroş", file: "songs/iro1.mp3" },
        { title: "3. ocak", file: "songs/yazılanlar v3.mp3" },
        { title: "4. indie v1", file: "songs/1.mp3" },
        { title: "5. indie v2", file: "songs/2.mp3" },
        { title: "6. summer house v1", file: "songs/summer v1-1.mp3" },
        { title: "7. summer house v2", file: "songs/summer v1-2.mp3" },
        { title: "8. summer house v3", file: "songs/summer v2-1.mp3" },
        { title: "9. summer house v4", file: "songs/summer v2-2.mp3" },
        { title: "10. summer house v5", file: "songs/summer v3-1.mp3" },
        { title: "11. summer house v6", file: "songs/summer v3-2.mp3" },
        { title: "12. truly yours", file: "songs/yours v1-1.mp3" },
        { title: "13. yours", file: "songs/yours v1-2.mp3" },
        { title: "14. ch v1", file: "songs/ch1-1.mp3" },
        { title: "15. ch v2", file: "songs/ch1-2.mp3" },
        { title: "16. ch v3", file: "songs/ch2-1.mp3" },
        { title: "17. ch v4", file: "songs/ch2-2.mp3" },
        { title: "18. flawed", file: "songs/mango1-1.mp3" },
        { title: "19. mangoes", file: "songs/mango1-2.mp3" },
        { title: "20. ant v1", file: "songs/ant1-1.mp3" },
        { title: "21. ant v2", file: "songs/ant1-2.mp3" },
        { title: "22. cabbar", file: "songs/jbbr1.mp3" },
        { title: "23. dafty", file: "songs/dp1-1.mp3" },
        { title: "24. punky", file: "songs/dp1-2.mp3" },
        { title: "25. İroş - acoustic", file: "songs/acous1-1.mp3" },
        //songs 
    ];

    let currentTrackIndex = 0;
    let isPlaying = false;
    let isShuffle = false;

    function loadTrack(index) {
        currentTrackIndex = index;
        if (playlist.length > 0) {
            audio.src = playlist[index].file;
            if (trackTitle) trackTitle.textContent = playlist[index].title;
        }
    }

    function playTrack(index) {
        if (index !== currentTrackIndex) {
            loadTrack(index);
        }
        togglePlay(true);
    }

    function togglePlay(forcePlay = null) {
        if (playlist.length === 0) return;

        if (forcePlay === true) {
            audio.play().then(() => {
                isPlaying = true;
                updateUI();
            }).catch(e => console.log("Playback failed:", e));
        } else if (forcePlay === false) {
            audio.pause();
            isPlaying = false;
            updateUI();
        } else {
            // Toggle
            if (isPlaying) {
                audio.pause();
                isPlaying = false;
            } else {
                audio.play();
                isPlaying = true;
            }
            updateUI();
        }
    }

    function playNext() {
        if (playlist.length === 0) return;

        let nextIndex;
        if (isShuffle) {
            if (playlist.length > 1) {
                do {
                    nextIndex = Math.floor(Math.random() * playlist.length);
                } while (nextIndex === currentTrackIndex);
            } else {
                nextIndex = 0;
            }
        } else {
            nextIndex = (currentTrackIndex + 1) % playlist.length;
        }
        playTrack(nextIndex);
    }

    function playPrev() {
        if (playlist.length === 0) return;
        let prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        playTrack(prevIndex);
    }

    const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    const pauseIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

    function updateUI() {
        if (playBtn) {
            playBtn.innerHTML = isPlaying ? pauseIcon : playIcon;
            playBtn.style.paddingLeft = isPlaying ? '0' : '4px'; // Visual centering for play icon
        }
        if (trackStatus) trackStatus.textContent = isPlaying ? "Playing" : "Paused";

        if (musicToggleImg) {
            if (isPlaying) {
                musicToggleImg.classList.add('rotating');
            } else {
                musicToggleImg.classList.remove('rotating');
            }
        }

        updatePlaylistUI();
    }

    if (playBtn) playBtn.addEventListener('click', () => togglePlay());
    if (nextBtn) nextBtn.addEventListener('click', () => playNext());
    if (prevBtn) prevBtn.addEventListener('click', () => playPrev());

    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            isShuffle = !isShuffle;
            shuffleBtn.classList.toggle('active', isShuffle);
        });
    }

    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            audio.volume = e.target.value;
        });
    }

    audio.addEventListener('ended', () => {
        playNext();
    });

    audio.addEventListener('error', (e) => {
        console.error("Error loading audio:", e);
        if (trackStatus) trackStatus.textContent = "Error";
    });

    const timeDisplay = document.getElementById('timeDisplay');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    const seekBar = document.getElementById('seekBar');

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function updateTimeDisplay() {
        const current = audio.currentTime;
        const duration = audio.duration;

        if (currentTimeEl) currentTimeEl.textContent = formatTime(current);
        if (durationEl) durationEl.textContent = formatTime(duration);

        if (seekBar) {
            if (!isNaN(duration)) {
                seekBar.max = duration;
            }
            seekBar.value = current;
        }

        if (timeDisplay) {
            timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
        }
    }

    if (seekBar) {
        seekBar.addEventListener('input', () => {
            if (currentTimeEl) currentTimeEl.textContent = formatTime(seekBar.value);
        });

        seekBar.addEventListener('change', () => {
            audio.currentTime = seekBar.value;
        });
    }

    audio.addEventListener('timeupdate', updateTimeDisplay);
    audio.addEventListener('loadedmetadata', updateTimeDisplay);

    const playlistElement = document.getElementById('playlist');

    function renderPlaylist() {
        if (!playlistElement) return;
        playlistElement.innerHTML = '';
        playlist.forEach((song, index) => {
            const li = document.createElement('li');
            li.classList.add('playlist-item');
            li.textContent = song.title;
            li.addEventListener('click', () => {
                playTrack(index);
            });
            playlistElement.appendChild(li);
        });
        updatePlaylistUI();
    }

    function updatePlaylistUI() {
        if (!playlistElement) return;
        const items = playlistElement.querySelectorAll('.playlist-item');
        items.forEach((item, index) => {
            if (index === currentTrackIndex) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    renderPlaylist();
    if (playlist.length > 0) {
        loadTrack(0);
        updatePlaylistUI();
    }
});