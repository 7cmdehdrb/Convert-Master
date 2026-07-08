// ========================================
// State Management
// ========================================
const state = {
    extractedImages: [], // Array of {id, data, page, format, width, height}
    selectedIds: new Set()
};

// ========================================
// DOM Elements
// ========================================
const elements = {
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    thumbnailSection: document.getElementById('thumbnailSection'),
    thumbnailGrid: document.getElementById('thumbnailGrid'),
    imageCount: document.getElementById('imageCount'),
    selectedCount: document.getElementById('selectedCount'),
    selectAllBtn: document.getElementById('selectAllBtn'),
    deselectAllBtn: document.getElementById('deselectAllBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    formatSelect: document.getElementById('formatSelect'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    toastContainer: document.getElementById('toastContainer')
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

function setLoading(isLoading, text = 'Extracting images...') {
    elements.loadingOverlay.classList.toggle('active', isLoading);
    elements.loadingText.textContent = text;
}

function updateCounts() {
    elements.imageCount.textContent = state.extractedImages.length;
    elements.selectedCount.textContent = state.selectedIds.size;
    elements.downloadBtn.disabled = state.selectedIds.size === 0;
}

// ========================================
// PDF Upload & Extraction
// ========================================

async function handlePdfUpload(file) {
    if (!file || file.type !== 'application/pdf') {
        showToast('Please select a valid PDF file', 'error');
        return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
        showToast('PDF file exceeds 50MB limit', 'error');
        return;
    }
    
    setLoading(true, 'Extracting images from PDF...');
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/convert/pdf-to-image', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Extraction failed');
        }
        
        const result = await response.json();
        
        if (result.image_count === 0) {
            setLoading(false);
            showToast('No images found in PDF', 'warning');
            return;
        }
        
        state.extractedImages = result.images;
        state.selectedIds.clear();
        
        setLoading(false);
        updateCounts();
        renderImages();
        showThumbnailSection();
        
        showToast(`Extracted ${result.image_count} image(s) successfully!`, 'success');
        
    } catch (error) {
        setLoading(false);
        console.error('Extraction error:', error);
        showToast(error.message || 'Failed to extract images', 'error');
    }
}

// ========================================
// UI Rendering
// ========================================

function showThumbnailSection() {
    elements.thumbnailSection.style.display = 'block';
}

function renderImages() {
    elements.thumbnailGrid.innerHTML = '';
    
    state.extractedImages.forEach((imageData) => {
        const item = createImageElement(imageData);
        elements.thumbnailGrid.appendChild(item);
    });
}

function createImageElement(imageData) {
    const div = document.createElement('div');
    div.className = 'thumbnail-item selectable-item';
    div.dataset.id = imageData.id;
    
    if (state.selectedIds.has(imageData.id)) {
        div.classList.add('selected');
    }
    
    div.innerHTML = `
        <img src="data:image/${imageData.format};base64,${imageData.data}" 
             alt="Page ${imageData.page}" 
             class="thumbnail-image">
        <div class="thumbnail-checkbox">
            <input type="checkbox" ${state.selectedIds.has(imageData.id) ? 'checked' : ''}>
        </div>
        <div class="thumbnail-info">
            <div class="thumbnail-meta">Page ${imageData.page}</div>
            <div class="thumbnail-meta">${imageData.width}×${imageData.height}</div>
        </div>
    `;
    
    // Click handler for selection
    div.addEventListener('click', () => {
        toggleSelection(imageData.id);
    });
    
    return div;
}

function toggleSelection(id) {
    if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
    } else {
        state.selectedIds.add(id);
    }
    
    updateCounts();
    renderImages();
}

// ========================================
// Selection Controls
// ========================================

elements.selectAllBtn.addEventListener('click', () => {
    state.extractedImages.forEach(img => state.selectedIds.add(img.id));
    updateCounts();
    renderImages();
});

elements.deselectAllBtn.addEventListener('click', () => {
    state.selectedIds.clear();
    updateCounts();
    renderImages();
});

// ========================================
// Download Logic
// ========================================

elements.downloadBtn.addEventListener('click', async () => {
    if (state.selectedIds.size === 0) {
        showToast('Please select at least one image', 'warning');
        return;
    }
    
    const selectedImages = state.extractedImages
        .filter(img => state.selectedIds.has(img.id))
        .map(img => img.data);
    
    const format = elements.formatSelect.value;
    
    // Get file handle FIRST (during user gesture) before any async operations
    let fileHandle = null;
    if ('showSaveFilePicker' in window) {
        try {
            // Determine filename based on selection count
            const filename = selectedImages.length > 1 ? 'images.zip' : `image.${format}`;
            
            fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: selectedImages.length > 1 ? 'ZIP Archive' : 'Image File',
                    accept: selectedImages.length > 1
                        ? { 'application/zip': ['.zip'] }
                        : { [`image/${format}`]: [`.${format}`] }
                }]
            });
        } catch (err) {
            if (err.name === 'AbortError') {
                showToast('Save cancelled', 'warning');
                return;
            }
            console.error('File picker error:', err);
            showToast('Failed to open save dialog', 'error');
            return;
        }
    }
    
    setLoading(true, `Converting to ${format.toUpperCase()}...`);
    
    try {
        const response = await fetch('/api/convert/download-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                images: selectedImages,
                format: format
            })
        });
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const contentType = response.headers.get('Content-Type');
        
        setLoading(false);
        
        // Determine filename and extension
        let filename;
        if (contentType === 'application/zip') {
            filename = 'images.zip';
        } else {
            filename = `image.${format}`;
        }
        
        // Write to file handle if available
        if (fileHandle) {
            try {
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                
                showToast('Images saved successfully!', 'success');
            } catch (err) {
                console.error('Save failed:', err);
                showToast('Failed to save file', 'error');
            }
        } else {
            // Fallback download for browsers without File System Access API
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showToast('Download started!', 'success');
        }
        
    } catch (error) {
        setLoading(false);
        console.error('Download error:', error);
        showToast(error.message || 'Failed to download images', 'error');
    }
});

// ========================================
// File Upload Handlers
// ========================================

elements.dropzone.addEventListener('click', () => {
    elements.fileInput.click();
});

elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handlePdfUpload(e.target.files[0]);
        e.target.value = '';
    }
});

elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('drag-over');
});

elements.dropzone.addEventListener('dragleave', () => {
    elements.dropzone.classList.remove('drag-over');
});

elements.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
        handlePdfUpload(e.dataTransfer.files[0]);
    }
});

// ========================================
// Initialization
// ========================================

console.log('🚀 PDF to Image Extractor initialized');
