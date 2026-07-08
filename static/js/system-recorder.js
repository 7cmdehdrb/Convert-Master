// ========================================
// State Management
// ========================================
const state = {
    systemStream: null,
    micStream: null,
    audioContext: null,
    systemGainNode: null,
    micGainNode: null,
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    isTestMode: false,
    recordingStartTime: null,
    timerInterval: null,
    recordedBlob: null,
    mp3Blob: null
};

// ========================================
// DOM Elements
// ========================================
const elements = {
    selectSystemBtn: document.getElementById('selectSystemBtn'),
    selectMicBtn: document.getElementById('selectMicBtn'),
    clearSystemBtn: document.getElementById('clearSystemBtn'),
    clearMicBtn: document.getElementById('clearMicBtn'),
    systemStatus: document.getElementById('systemStatus'),
    micStatus: document.getElementById('micStatus'),
    systemVolumeControl: document.getElementById('systemVolumeControl'),
    micVolumeControl: document.getElementById('micVolumeControl'),
    systemVolumeSlider: document.getElementById('systemVolumeSlider'),
    micVolumeSlider: document.getElementById('micVolumeSlider'),
    systemVolumeValue: document.getElementById('systemVolumeValue'),
    micVolumeValue: document.getElementById('micVolumeValue'),
    previewTitle: document.getElementById('previewTitle'),
    previewSubtitle: document.getElementById('previewSubtitle'),
    recordingSection: document.getElementById('recordingSection'),
    recordBtn: document.getElementById('recordBtn'),
    recordingStatus: document.getElementById('recordingStatus'),
    recordingTime: document.getElementById('recordingTime'),
    previewSection: document.getElementById('previewSection'),
    audioPreview: document.getElementById('audioPreview'),
    newRecordingBtn: document.getElementById('newRecordingBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    toastContainer: document.getElementById('toastContainer'),
    browserWarning: document.getElementById('browserWarning')
};

// ========================================
// Utility Functions
// ========================================

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = { success: '✓', error: '✕', warning: '⚠' };
    
    toast.innerHTML = `
        <div class="toast-icon">${iconMap[type] || '•'}</div>
        <div class="toast-message">${message}</div>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 250ms ease-out reverse';
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

function setLoading(isLoading, text = 'Processing audio...') {
    elements.loadingOverlay.classList.toggle('active', isLoading);
    elements.loadingText.textContent = text;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function checkBrowserCompatibility() {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    
    if (!isChrome && !isEdge) {
        elements.browserWarning.style.display = 'block';
    }
    
    if (!window.isSecureContext) {
        elements.browserWarning.innerHTML = '<strong>보안 경고:</strong> 시스템 오디오 및 마이크 녹음 기능은 <a href="https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts" target="_blank">보안 연결 (HTTPS)</a> 환경에서만 작동합니다. (localhost 제외)';
        elements.browserWarning.style.display = 'block';
    }
}

// ========================================
// Device Selection
// ========================================

async function selectSystemAudio() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            showToast('브라우저 보안 정책: HTTPS 또는 localhost 접속이 필요합니다.', 'error');
            console.error('navigator.mediaDevices.getDisplayMedia is not available. This feature requires a secure context (HTTPS) or localhost.');
            return;
        }

        // Stop existing stream if any
        if (state.systemStream) {
            state.systemStream.getTracks().forEach(track => track.stop());
        }
        
        // Show instruction
        showToast('Select a tab/window with audio (오디오 있는 탭/창 선택)', 'warning');
        
        // Request display media with audio
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1, height: 1 }, // Minimal video (required)
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        
        // Extract only audio track
        const audioTracks = stream.getAudioTracks();
        
        if (audioTracks.length === 0) {
            throw new Error('선택한 소스에 오디오가 없습니다');
        }
        
        // Stop video tracks (we only need audio)
        stream.getVideoTracks().forEach(track => track.stop());
        
        state.systemStream = new MediaStream(audioTracks);
        const trackLabel = audioTracks[0].label || 'System Audio';
        elements.systemStatus.textContent = `✓ ${trackLabel}`;
        elements.systemStatus.classList.add('active');
        elements.clearSystemBtn.style.display = 'inline-block';
        
        // Show volume control
        elements.systemVolumeControl.style.display = 'block';
        
        checkRecordingReady();
        showToast('System audio connected', 'success');
        
    } catch (error) {
        console.error('System audio error:', error);
        if (error.name !== 'NotAllowedError') {
            showToast('Failed to capture system audio', 'error');
        }
    }
}

async function selectMicrophone() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('브라우저 보안 정책: HTTPS 또는 localhost 접속이 필요합니다.', 'error');
            console.error('navigator.mediaDevices.getUserMedia is not available. This feature requires a secure context (HTTPS) or localhost.');
            return;
        }

        // Stop existing stream if any and revoke permissions
        if (state.micStream) {
            state.micStream.getTracks().forEach(track => {
                track.stop();
                // Remove track to force permission re-request
            });
            state.micStream = null;
            
            // Add small delay to ensure cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Request microphone WITHOUT deviceId to trigger browser selection dialog
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
                // Deliberately not setting deviceId to show selection dialog
            }
        });
        
        state.micStream = stream;
        const trackLabel = stream.getAudioTracks()[0].label || 'Microphone';
        elements.micStatus.textContent = `✓ ${trackLabel}`;
        elements.micStatus.classList.add('active');
        elements.clearMicBtn.style.display = 'inline-block';
        
        // Show volume control
        elements.micVolumeControl.style.display = 'block';
        
        checkRecordingReady();
        showToast('Microphone connected', 'success');
        
    } catch (error) {
        console.error('Microphone error:', error);
        if (error.name !== 'NotAllowedError') {
            showToast('Failed to access microphone', 'error');
        }
    }
}

function clearSystemAudio() {
    if (state.systemStream) {
        state.systemStream.getTracks().forEach(track => track.stop());
        state.systemStream = null;
    }
    elements.systemStatus.textContent = 'Not selected';
    elements.systemStatus.classList.remove('active');
    elements.clearSystemBtn.style.display = 'none';
    elements.systemVolumeControl.style.display = 'none';
    checkRecordingReady();
    showToast('System audio cleared', 'success');
}

function clearMicrophone() {
    if (state.micStream) {
        state.micStream.getTracks().forEach(track => track.stop());
        state.micStream = null;
    }
    elements.micStatus.textContent = 'Not selected';
    elements.micStatus.classList.remove('active');
    elements.clearMicBtn.style.display = 'none';
    elements.micVolumeControl.style.display = 'none';
    checkRecordingReady();
    showToast('Microphone cleared', 'success');
}

function checkRecordingReady() {
    // Allow recording with at least one source
    const hasAnySource = state.systemStream || state.micStream;
    
    elements.recordBtn.disabled = !hasAnySource;
    
    if (hasAnySource) {
        elements.recordingSection.style.display = 'block';
    } else {
        elements.recordingSection.style.display = 'none';
    }
}

// ========================================
// Audio Mixing
// ========================================

function mixAudioStreams() {
    // Create audio context if not exists
    if (!state.audioContext) {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const context = state.audioContext;
    const destination = context.createMediaStreamDestination();
    
    // Connect available sources with gain nodes
    if (state.systemStream) {
        const systemSource = context.createMediaStreamSource(state.systemStream);
        state.systemGainNode = context.createGain();
        
        // Set gain from slider (0-2x)
        const systemVolume = parseInt(elements.systemVolumeSlider.value) / 100;
        state.systemGainNode.gain.value = systemVolume;
        
        systemSource.connect(state.systemGainNode);
        state.systemGainNode.connect(destination);
    }
    
    if (state.micStream) {
        const micSource = context.createMediaStreamSource(state.micStream);
        state.micGainNode = context.createGain();
        
        // Set gain from slider (0-2x)
        const micVolume = parseInt(elements.micVolumeSlider.value) / 100;
        state.micGainNode.gain.value = micVolume;
        
        micSource.connect(state.micGainNode);
        state.micGainNode.connect(destination);
    }
    
    return destination.stream;
}

// ========================================
// Recording
// ========================================

function startRecording() {
    state.audioChunks = [];
    
    // Mix audio streams
    const mixedStream = mixAudioStreams();
    
    // Create media recorder
    const options = { mimeType: 'audio/webm;codecs=opus' };
    state.mediaRecorder = new MediaRecorder(mixedStream, options);
    
    state.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            state.audioChunks.push(e.data);
        }
    };
    
    state.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
        state.recordedBlob = audioBlob;
        
        // Convert to MP3
        await convertToMP3(audioBlob);
    };
    
    state.mediaRecorder.start();
    state.isRecording = true;
    state.recordingStartTime = Date.now();
    
    // Update UI
    elements.recordBtn.classList.add('recording');
    elements.recordBtn.querySelector('.record-text').textContent = 'Stop Recording';
    elements.recordingStatus.style.display = 'flex';
    
    // Start timer
    state.timerInterval = setInterval(updateTimer, 1000);
}

function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
        state.mediaRecorder.stop();
        state.isRecording = false;
        
        // Clear timer
        clearInterval(state.timerInterval);
        
        // Update UI
        elements.recordBtn.classList.remove('recording');
        elements.recordBtn.querySelector('.record-text').textContent = 'Start Recording';
        elements.recordingStatus.style.display = 'none';
    }
}

function updateTimer() {
    if (state.isRecording) {
        const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
        elements.recordingTime.textContent = formatTime(elapsed);
    }
}

// ========================================
// MP3 Conversion
// ========================================

async function convertToMP3(audioBlob) {
    setLoading(true, 'Converting to MP3...');
    
    try {
        // Decode audio data
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await state.audioContext.decodeAudioData(arrayBuffer);
        
        // Get channel data
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.numberOfChannels > 1 
            ? audioBuffer.getChannelData(1) 
            : leftChannel;
        
        // Convert to 16-bit PCM
        const leftPCM = convertFloat32To16Bit(leftChannel);
        const rightPCM = convertFloat32To16Bit(rightChannel);
        
        // Encode to MP3 using lamejs
        const mp3Encoder = new lamejs.Mp3Encoder(2, audioBuffer.sampleRate, 128);
        const mp3Data = [];
        
        const sampleBlockSize = 1152;
        for (let i = 0; i < leftPCM.length; i += sampleBlockSize) {
            const leftChunk = leftPCM.subarray(i, i + sampleBlockSize);
            const rightChunk = rightPCM.subarray(i, i + sampleBlockSize);
            const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }
        }
        
        // Flush remaining data
        const mp3buf = mp3Encoder.flush();
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
        
        // Create MP3 blob
        state.mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
        
        setLoading(false);
        showPreview();
        showToast('Audio converted to MP3', 'success');
        
    } catch (error) {
        setLoading(false);
        console.error('MP3 conversion error:', error);
        showToast('Failed to convert to MP3', 'error');
    }
}

function convertFloat32To16Bit(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
}

// ========================================
// Preview & Download
// ========================================

function showPreview() {
    elements.previewSection.style.display = 'block';
    
    // Update title based on mode
    if (state.isTestMode) {
        elements.previewTitle.textContent = 'Test Recording Complete (5초 테스트 완료)';
        elements.previewSubtitle.textContent = 'Listen to your test recording';
    } else {
        elements.previewTitle.textContent = 'Recording Complete (녹음 완료)';
        elements.previewSubtitle.textContent = 'Preview first 30 seconds';
    }
    
    // Create preview URL
    const audioURL = URL.createObjectURL(state.mp3Blob);
    elements.audioPreview.src = audioURL;
    
    // Add event listener to limit to 30 seconds (for non-test recordings)
    if (!state.isTestMode) {
        elements.audioPreview.addEventListener('timeupdate', function() {
            if (this.currentTime > 30) {
                this.pause();
                this.currentTime = 0;
                showToast('Preview limited to 30 seconds', 'warning');
            }
        });
    }
}

async function downloadMP3() {
    if (!state.mp3Blob) {
        showToast('No recording to download', 'error');
        return;
    }
    
    const filename = `recording_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.mp3`;
    
    // Use File System Access API
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'MP3 Audio',
                    accept: { 'audio/mp3': ['.mp3'] }
                }]
            });
            
            const writable = await handle.createWritable();
            await writable.write(state.mp3Blob);
            await writable.close();
            
            showToast('MP3 saved successfully!', 'success');
        } catch (err) {
            if (err.name === 'AbortError') {
                showToast('Save cancelled', 'warning');
            } else {
                console.error('Save failed:', err);
                showToast('Failed to save file', 'error');
            }
        }
    } else {
        // Fallback download
        const url = URL.createObjectURL(state.mp3Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('MP3 downloaded!', 'success');
    }
}

function newRecording() {
    // Reset state
    state.recordedBlob = null;
    state.mp3Blob = null;
    state.audioChunks = [];
    
    // Hide preview
    elements.previewSection.style.display = 'none';
    elements.audioPreview.src = '';
}



// ========================================
// Volume Control
// ========================================

elements.systemVolumeSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    elements.systemVolumeValue.textContent = `${value}%`;
    
    // Update gain if currently recording or have gain node
    if (state.systemGainNode) {
        state.systemGainNode.gain.value = value / 100;
    }
});

elements.micVolumeSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    elements.micVolumeValue.textContent = `${value}%`;
    
    // Update gain if currently recording or have gain node
    if (state.micGainNode) {
        state.micGainNode.gain.value = value / 100;
    }
});

// ========================================
// Event Listeners
// ========================================

elements.selectSystemBtn.addEventListener('click', selectSystemAudio);
elements.selectMicBtn.addEventListener('click', selectMicrophone);
elements.clearSystemBtn.addEventListener('click', clearSystemAudio);
elements.clearMicBtn.addEventListener('click', clearMicrophone);

elements.recordBtn.addEventListener('click', () => {
    if (state.isRecording) {
        stopRecording();
    } else {
        state.isTestMode = false;
        startRecording();
    }
});
elements.downloadBtn.addEventListener('click', downloadMP3);
elements.newRecordingBtn.addEventListener('click', newRecording);

// ========================================
// Initialization
// ========================================

checkBrowserCompatibility();
console.log('🚀 System Recorder initialized');
