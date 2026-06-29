# 디렉터리 구조 설명

이 문서는 현재 저장소의 주요 파일과 디렉터리가 어떤 역할을 하는지 설명합니다.

## 전체 구조

```text
Convert-Master/
├── .dockerignore
├── .gitignore
├── Dockerfile
├── README.docker.md
├── README.md
├── config.py
├── converters/
│   ├── __init__.py
│   ├── base.py
│   ├── image_to_pdf.py
│   └── pdf_to_image.py
├── docker-compose.yml
├── docs/
│   ├── DIRECTORY_STRUCTURE.md
│   └── PROJECT_OVERVIEW.md
├── img.png
├── main.py
├── requirements.txt
├── routes/
│   ├── __init__.py
│   └── converter.py
└── utils/
    ├── __init__.py
    ├── archive.py
    └── validators.py
```

## 루트 파일

### `README.md`

사용자 중심의 프로젝트 소개 문서입니다. 앱이 무엇을 하는지, 어떤 상황에서 유용한지, 빠르게 실행하는 방법, 개발자가 어디에서 기술 문서를 확인하면 되는지를 안내합니다.

### `README.docker.md`

Docker 및 Docker Compose로 애플리케이션을 실행하는 방법을 설명합니다. 컨테이너 실행, 로그 확인, 포트 변경, 헬스 체크, 문제 해결 명령을 포함합니다.

### `main.py`

FastAPI 애플리케이션의 진입점입니다.

- 앱 메타데이터 설정
- CORS 미들웨어 등록
- 변환 API 라우터 등록
- `/static` 정적 파일 경로 마운트
- `/` 및 `/health` 엔드포인트 정의
- 직접 실행 시 Uvicorn 서버 시작

### `config.py`

애플리케이션 설정을 관리합니다. `pydantic-settings`의 `BaseSettings`를 사용하므로 환경 변수 또는 `.env` 파일로 기본값을 덮어쓸 수 있습니다.

주요 설정 범위는 다음과 같습니다.

- 앱 이름과 버전
- 서버 호스트와 포트
- CORS 정책
- 업로드 파일 제한
- 지원 이미지 MIME 타입
- 로그 레벨

### `requirements.txt`

Python 런타임 의존성을 정의합니다.

주요 패키지:

- `fastapi`
- `uvicorn[standard]`
- `img2pdf`
- `Pillow`
- `python-multipart`
- `pydantic-settings`
- `pymupdf`

### `Dockerfile`

컨테이너 이미지를 빌드하기 위한 설정입니다.

- `python:3.13.7-slim` 기반 이미지 사용
- `/app` 작업 디렉터리 설정
- Python 의존성 설치
- 애플리케이션 코드 복사
- non-root 사용자 `appuser`로 실행
- 8000 포트 노출
- `/health` 기반 헬스 체크 설정

### `docker-compose.yml`

로컬 또는 서버 환경에서 컨테이너를 쉽게 실행하기 위한 Compose 설정입니다.

- 서비스 이름: `web-converter`
- 컨테이너 이름: `multi-tool-converter`
- 호스트 8000 포트를 컨테이너 8000 포트로 연결
- `HOST`, `PORT`, `LOG_LEVEL` 환경 변수 설정
- Docker 헬스 체크 설정

### `img.png`

README에서 사용하는 프로젝트 스크린샷 또는 대표 이미지입니다.

## `converters/`

파일 변환 로직을 담당하는 계층입니다. API 라우터는 요청을 받은 뒤 이 계층의 변환기를 호출합니다.

### `converters/base.py`

모든 변환기가 따르는 추상 기반 클래스입니다.

핵심 메서드:

- `validate(files)`: 업로드 파일 검증 및 바이트 데이터 반환
- `convert(file_contents)`: 검증된 데이터를 목표 형식으로 변환
- `get_response(converted_data, filename)`: FastAPI 응답 객체 생성
- `process(files, output_filename)`: 검증 → 변환 → 응답 생성 파이프라인 실행

### `converters/image_to_pdf.py`

여러 이미지 파일을 하나의 PDF로 변환합니다.

처리 단계:

1. 업로드 파일 개수 확인
2. 파일별 최대 크기 확인
3. Pillow로 이미지 유효성 검증
4. `img2pdf.convert()`로 PDF 생성
5. `StreamingResponse`로 PDF 다운로드 응답 반환

### `converters/pdf_to_image.py`

PDF 파일에서 포함 이미지 객체를 추출합니다.

처리 단계:

1. PDF 파일이 정확히 하나인지 확인
2. 파일 크기 확인
3. PyMuPDF로 PDF 유효성 검증
4. 페이지별 이미지 XREF를 순회하며 이미지 추출
5. 이미지 메타데이터와 base64 데이터를 JSON으로 반환

## `routes/`

HTTP API 라우팅을 담당합니다.

### `routes/converter.py`

`/api/convert` 하위 API를 정의합니다.

| 경로 | 설명 |
| --- | --- |
| `POST /api/convert/image-to-pdf` | 이미지 파일들을 PDF로 변환 |
| `POST /api/convert/pdf-to-image` | PDF에서 이미지 추출 |
| `POST /api/convert/download-images` | base64 이미지들을 이미지 파일 또는 ZIP으로 다운로드 |

또한 `DownloadRequest` 모델을 통해 이미지 다운로드 요청의 JSON 구조를 정의합니다.

### `routes/__init__.py`

라우터를 패키지 외부에서 가져오기 쉽게 노출합니다.

## `utils/`

공통 유틸리티 함수들을 담는 계층입니다.

### `utils/archive.py`

여러 이미지 바이트와 파일명을 받아 ZIP 아카이브 바이트를 생성하는 `create_zip()` 함수를 제공합니다.

### `utils/validators.py`

파일 개수, 파일 크기, 이미지 유효성, 확장자 검증을 위한 보조 함수를 제공합니다. 현재 일부 검증은 변환기 내부에서 직접 수행되지만, 향후 공통 검증 로직으로 재사용할 수 있습니다.

### `utils/__init__.py`

유틸리티 함수를 패키지 외부에서 가져오기 쉽게 노출합니다.

## 정적 파일 관련 참고

`main.py`는 `static/` 디렉터리를 `/static` 경로로 마운트하도록 작성되어 있습니다. 따라서 웹 UI를 제공하려면 다음과 같은 파일이 필요할 수 있습니다.

```text
static/
├── index.html
├── pdf-to-image.html
└── 기타 CSS/JavaScript/assets
```

현재 저장소에는 `static/` 디렉터리가 없으므로, API 서버 중심으로 실행하거나 정적 프론트엔드 파일을 별도로 추가해야 합니다.
