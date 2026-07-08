// ========================================
// State Management
// ========================================
const state = {
    files: [], // Array of {file: File, id: string, preview: string}
    sortable: null
};

// ========================================
// DOM Elements
// ========================================
const elements = {
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    thumbnailSection: document.getElementById('thumbnailSection'),
    thumbnailGrid: document.getElementById('thumbnailGrid'),
    fileCount: document.getElementById('fileCount'),
    convertBtn: document.getElementById('convertBtn'),
    clearBtn: document.getElementById('clearBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    toastContainer: document.getElementById('toastContainer')
};

// ========================================
// Utility Functions
// ========================================

/**
 * Generate a unique ID
 */
function generateId() {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: '✓',
        error: '✕',
        warning: '⚠'
    };
    
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

/**
 * Show/hide loading overlay
 */
function setLoading(isLoading) {
    elements.loadingOverlay.classList.toggle('active', isLoading);
}

/**
 * Update file count display
 */
function updateFileCount() {
    elements.fileCount.textContent = state.files.length;
}

/**
 * Generate thumbnail preview for an image file
 */
function generateThumbnail(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Create canvas for thumbnail
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas size (maintain aspect ratio)
                const maxSize = 400;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to data URL
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            
            img.onerror = reject;
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ========================================
// File Management
// ========================================

/**
 * Add files to state and render thumbnails
 */
async function addFiles(files) {
    const fileArray = Array.from(files);
    
    // Filter for images only
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showToast('Please select valid image files', 'error');
        return;
    }
    
    if (imageFiles.length !== fileArray.length) {
        showToast(`${fileArray.length - imageFiles.length} non-image file(s) ignored`, 'warning');
    }
    
    // Check file size
    const oversizedFiles = imageFiles.filter(file => file.size > 50 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
        showToast('Some files exceed 50MB and were skipped', 'error');
        imageFiles.splice(0, imageFiles.length, ...imageFiles.filter(file => file.size <= 50 * 1024 * 1024));
    }
    
    // Generate thumbnails
    setLoading(true);
    
    for (const file of imageFiles) {
        try {
            const preview = await generateThumbnail(file);
            const id = generateId();
            
            state.files.push({ file, id, preview });
        } catch (error) {
            console.error('Failed to generate thumbnail:', error);
            showToast(`Failed to process ${file.name}`, 'error');
        }
    }
    
    setLoading(false);
    
    updateFileCount();
    renderThumbnails();
    showThumbnailSection();
    
    showToast(`${imageFiles.length} image(s) added successfully`, 'success');
}

/**
 * Remove a file from state
 */
function removeFile(id) {
    const index = state.files.findIndex(f => f.id === id);
    if (index > -1) {
        state.files.splice(index, 1);
        updateFileCount();
        renderThumbnails();
        
        if (state.files.length === 0) {
            hideThumbnailSection();
        }
        
        showToast('Image removed', 'success');
    }
}

/**
 * Clear all files
 */
function clearAllFiles() {
    if (state.files.length === 0) return;
    
    state.files = [];
    updateFileCount();
    renderThumbnails();
    hideThumbnailSection();
    showToast('All images cleared', 'success');
}

// ========================================
// UI Rendering
// ========================================

/**
 * Show thumbnail section with animation
 */
function showThumbnailSection() {
    elements.thumbnailSection.style.display = 'block';
}

/**
 * Hide thumbnail section
 */
function hideThumbnailSection() {
    elements.thumbnailSection.style.display = 'none';
}

/**
 * Render all thumbnails
 */
function renderThumbnails() {
    elements.thumbnailGrid.innerHTML = '';
    
    state.files.forEach((fileData, index) => {
        const item = createThumbnailElement(fileData, index);
        elements.thumbnailGrid.appendChild(item);
    });
    
    // Re-initialize Sortable after rendering
    initializeSortable();
}

/**
 * Create a thumbnail element
 */
function createThumbnailElement(fileData, index) {
    const div = document.createElement('div');
    div.className = 'thumbnail-item';
    div.dataset.id = fileData.id;
    
    div.innerHTML = `
        <img src="${fileData.preview}" alt="${fileData.file.name}" class="thumbnail-image">
        <div class="thumbnail-order">${index + 1}</div>
        <div class="thumbnail-overlay">
            <button class="thumbnail-delete" data-id="${fileData.id}">×</button>
            <div class="thumbnail-name">${fileData.file.name}</div>
        </div>
    `;
    
    // Add delete handler
    const deleteBtn = div.querySelector('.thumbnail-delete');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFile(fileData.id);
    });
    
    return div;
}

/**
 * Initialize SortableJS for drag-and-drop reordering
 */
function initializeSortable() {
    if (state.sortable) {
        state.sortable.destroy();
    }
    
    state.sortable = Sortable.create(elements.thumbnailGrid, {
        animation: 250,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onEnd: handleSortEnd
    });
}

/**
 * Handle sort end event - update state order
 */
function handleSortEnd(evt) {
    // Get new order from DOM
    const thumbnailItems = elements.thumbnailGrid.querySelectorAll('.thumbnail-item');
    const newOrder = Array.from(thumbnailItems).map(item => item.dataset.id);
    
    // Reorder state.files based on newOrder
    const reorderedFiles = newOrder.map(id => state.files.find(f => f.id === id));
    state.files = reorderedFiles;
    
    // Re-render to update order numbers
    renderThumbnails();
}

// ========================================
// File Upload Handlers
// ========================================

/**
 * Handle dropzone click
 */
elements.dropzone.addEventListener('click', () => {
    elements.fileInput.click();
});

/**
 * Handle file input change
 */
elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        addFiles(e.target.files);
        e.target.value = ''; // Reset input
    }
});

/**
 * Handle drag over
 */
elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('drag-over');
});

/**
 * Handle drag leave
 */
elements.dropzone.addEventListener('dragleave', () => {
    elements.dropzone.classList.remove('drag-over');
});

/**
 * Handle drop
 */
elements.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
    }
});

// ========================================
// Action Handlers
// ========================================

/**
 * Handle convert button click
 */
elements.convertBtn.addEventListener('click', async () => {
    if (state.files.length === 0) {
        showToast('Please add images first', 'warning');
        return;
    }
    
    setLoading(true);
    
    try {
        // Create FormData with files in current order
        const formData = new FormData();
        state.files.forEach((fileData) => {
            formData.append('files', fileData.file);
        });
        
        // Use File System Access API for "Save As" dialog FIRST to avoid SecurityError
        let fileHandle = null;
        let useFallback = false;

        if ('showSaveFilePicker' in window) {
            try {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'converted_images.pdf',
                    types: [{
                        description: 'PDF Files',
                        accept: { 'application/pdf': ['.pdf'] }
                    }]
                });
            } catch (err) {
                setLoading(false);
                // User cancelled the save dialog
                if (err.name === 'AbortError') {
                    showToast('Save cancelled', 'warning');
                } else {
                    console.error('Save dialog failed:', err);
                    showToast('Failed to open save dialog', 'error');
                }
                return; // Stop execution if no file chosen
            }
        } else {
            useFallback = true;
        }

        // Send to backend - UPDATED ENDPOINT
        const response = await fetch('/api/convert/image-to-pdf', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Conversion failed');
        }
        
        // Get PDF blob
        const blob = await response.blob();
        
        setLoading(false);
        
        if (fileHandle) {
            try {
                // Write the file
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                
                showToast('PDF saved successfully!', 'success');
            } catch (err) {
                console.error('Save failed:', err);
                showToast('Failed to save file', 'error');
            }
        } else if (useFallback) {
            // Fallback for browsers that don't support File System Access API
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'converted_images.pdf';
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showToast('PDF downloaded successfully!', 'success');
        }
        
    } catch (error) {
        setLoading(false);
        console.error('Conversion error:', error);
        showToast(error.message || 'Failed to convert images', 'error');
    }
});

/**
 * Handle clear button click
 */
elements.clearBtn.addEventListener('click', () => {
    clearAllFiles();
});

// ========================================
// Initialization
// ========================================

console.log('🚀 Multi-Tool Web Converter initialized');
