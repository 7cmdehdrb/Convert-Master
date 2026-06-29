# 프로젝트 전체 설명

## 프로젝트 한 줄 요약

**Multi-Tool Web Converter**는 브라우저에서 파일을 업로드하고 변환 결과를 내려받을 수 있도록 만든 FastAPI 기반 웹 변환 애플리케이션입니다.

현재 백엔드 코드 기준으로 제공되는 주요 기능은 다음과 같습니다.

- 여러 이미지 파일을 하나의 PDF로 병합
- PDF 안에 포함된 이미지 객체를 추출
- 추출한 이미지를 PNG, JPEG/JPG, WEBP 형식으로 변환하여 단일 파일 또는 ZIP으로 다운로드
- `/health` 엔드포인트를 통한 서비스 상태 확인

> 참고: 기존 README에는 브라우저 녹음 기능과 정적 페이지 정보가 포함되어 있었지만, 현재 저장소에는 `static/` 디렉터리가 포함되어 있지 않습니다. `main.py`는 `/static` 경로를 마운트하도록 작성되어 있으므로, 실제 웹 UI를 실행하려면 정적 프론트엔드 파일이 함께 제공되어야 합니다.

## 주요 사용자 시나리오

### 1. 이미지를 PDF로 만들기

사용자는 JPG, PNG, WEBP, BMP, TIFF 등 이미지 파일을 여러 개 업로드하고, 서버는 업로드된 순서대로 하나의 PDF 파일을 생성해 다운로드 응답으로 반환합니다.

### 2. PDF에서 이미지 추출하기

사용자는 PDF 파일 하나를 업로드하고, 서버는 PyMuPDF를 사용해 PDF 내부에 포함된 이미지 객체를 추출합니다. 응답에는 이미지의 페이지 번호, 포맷, 크기, 바이트 크기, base64 데이터가 포함됩니다.

### 3. 추출 이미지 다운로드하기

클라이언트는 추출한 이미지의 base64 데이터를 서버로 다시 전달하고 원하는 출력 포맷을 지정할 수 있습니다. 선택 이미지가 하나면 이미지 파일을 직접 받고, 여러 개면 ZIP 파일로 받습니다.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 웹 프레임워크 | FastAPI |
| ASGI 서버 | Uvicorn |
| 설정 관리 | pydantic-settings |
| 이미지 처리 | Pillow |
| 이미지 → PDF | img2pdf |
| PDF 이미지 추출 | PyMuPDF (`fitz`) |
| 업로드 처리 | python-multipart |
| 배포 | Docker, Docker Compose |

## 애플리케이션 흐름

```text
클라이언트
  |
  | multipart/form-data 또는 JSON 요청
  v
FastAPI 라우터 (`routes/converter.py`)
  |
  | 기능별 변환기 호출
  v
Converter 계층 (`converters/`)
  |
  | 파일 검증 및 변환
  v
FastAPI Response / StreamingResponse / JSONResponse
  |
  v
클라이언트 다운로드 또는 화면 표시
```

## API 개요

| 메서드 | 경로 | 설명 | 응답 |
| --- | --- | --- | --- |
| `GET` | `/` | 메인 정적 페이지로 리다이렉트 | `/static/index.html` |
| `GET` | `/health` | 서비스 상태 확인 | JSON |
| `POST` | `/api/convert/image-to-pdf` | 여러 이미지를 하나의 PDF로 변환 | PDF 스트림 |
| `POST` | `/api/convert/pdf-to-image` | PDF에서 이미지 객체 추출 | JSON |
| `POST` | `/api/convert/download-images` | base64 이미지들을 지정 포맷으로 다운로드 | 이미지 또는 ZIP 스트림 |

## 설정값

기본 설정은 `config.py`에 정의되어 있으며, `.env` 파일 또는 환경 변수로 덮어쓸 수 있습니다.

| 설정 | 기본값 | 설명 |
| --- | --- | --- |
| `APP_TITLE` | `Multi-Tool Web Converter` | FastAPI 앱 제목 |
| `APP_VERSION` | `1.2.0` | 앱 버전 |
| `HOST` | `0.0.0.0` | 서버 바인딩 주소 |
| `PORT` | `8000` | 서버 포트 |
| `RELOAD` | `true` | Uvicorn reload 여부 |
| `MAX_FILE_SIZE` | `52428800` | 파일당 최대 크기, 50MB |
| `MAX_FILES_PER_REQUEST` | `100` | 요청당 최대 이미지 파일 수 |
| `LOG_LEVEL` | `INFO` | 로깅 레벨 |

## 제한 사항 및 주의 사항

- PDF 이미지 추출은 PDF 안에 포함된 이미지 객체를 대상으로 합니다. 벡터 그래픽, 텍스트, 렌더링 결과 전체 페이지 이미지는 자동으로 이미지 파일로 추출되지 않을 수 있습니다.
- 이미지 → PDF 변환은 서버가 받은 파일 순서를 기준으로 수행됩니다. 프론트엔드에서 정렬 기능을 제공한다면 정렬된 순서대로 multipart 요청을 보내야 합니다.
- 업로드 파일 검증은 Pillow 및 PyMuPDF가 읽을 수 있는지 여부에 기반합니다.
- 현재 저장소에는 `static/` 프론트엔드 파일이 없으므로, 웹 UI 실행 시 정적 파일 추가가 필요합니다.

## 관련 문서

- [디렉터리 구조 설명](./DIRECTORY_STRUCTURE.md)
- [Docker 배포 가이드](../README.docker.md)
