# Multi-Tool Web Converter

Web app built with FastAPI for common conversion and recording tasks.

Current features in this workspace:
- Merge multiple images into one PDF
- Extract embedded images from a PDF and download selected results
- Record system audio and microphone in browser, then export MP3

## Features

### 1) Image to PDF
- Multi-file image upload (drag and drop)
- Thumbnail preview and drag reorder (SortableJS)
- Conversion in the exact selected order
- Save using `showSaveFilePicker` when supported, with download fallback

### 2) PDF to Image
- Upload one PDF and extract embedded images (PyMuPDF)
- View metadata (page, format, dimensions)
- Select one or many images and convert to `png/jpeg/webp`
- Single file download for one image, ZIP download for multiple images

### 3) System Recorder
- Capture system audio and/or microphone using browser APIs
- Per-source volume control (0% to 200%)
- In-browser MP3 encoding via `lamejs`
- Chrome/Edge recommended for best compatibility

## Tech Stack

- Backend: FastAPI, Uvicorn
- Conversion: `img2pdf`, `PyMuPDF (fitz)`, `Pillow`
- Frontend: Vanilla JS, SortableJS, Web Audio API, MediaRecorder API
- Packaging: Docker, Docker Compose

## Project Structure

```text
.
|- main.py                  # FastAPI entry point
|- config.py                # App settings (.env supported)
|- routes/
|  |- converter.py          # Conversion API routes
|- converters/
|  |- base.py               # Base converter abstraction
|  |- image_to_pdf.py       # Image -> PDF converter
|  |- pdf_to_image.py       # PDF image extractor
|- utils/
|  |- archive.py            # ZIP utility
|- static/
   |- index.html            # Image to PDF page
   |- pdf-to-image.html     # PDF to Image page
   |- system-recorder.html  # System Recorder page
```

## Quick Start (Local)

### 1) Install dependencies
```bash
pip install -r requirements.txt
```

### 2) Run server
```bash
python main.py
```

Default URLs:
- App: `http://localhost:8000/`
- Health: `http://localhost:8000/health`

## Run with Docker

### Docker Compose
```bash
docker-compose up -d
```

### Docker CLI
```bash
docker build -t web-converter:latest .
docker run -d -p 8000:8000 --name web-converter web-converter:latest
```

## API Summary

### `POST /api/convert/image-to-pdf`
- Input: `multipart/form-data` with `files` (multiple images)
- Output: PDF stream response

### `POST /api/convert/pdf-to-image`
- Input: `multipart/form-data` with `file` (single PDF)
- Output: JSON list of extracted images (base64 included)

### `POST /api/convert/download-images`
- Input: JSON
  - `images`: list of base64 strings
  - `format`: `png | jpeg | jpg | webp`
- Output:
  - Single selected image: one image file
  - Multiple selected images: ZIP archive

## Configuration

Defaults in `config.py`:
- `HOST=0.0.0.0`
- `PORT=8000`
- `RELOAD=true`
- `MAX_FILE_SIZE=52428800` (50 MB)
- `MAX_FILES_PER_REQUEST=100`
- `LOG_LEVEL=INFO`

You can override values with a `.env` file.

## Notes and Limitations

- PDF extraction targets embedded image objects; vector graphics may not appear as extracted images.
- System audio capture behavior depends on browser and OS permissions.
- Browsers without File System Access API use standard download fallback.
