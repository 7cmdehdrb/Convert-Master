# Docker Deployment Guide

이 가이드는 Multi-Tool Web Converter를 Docker로 실행하는 방법을 설명합니다.

## 사전 요구사항

- Docker Desktop (Windows)
- Docker Compose

## 빠른 시작

### 1. Docker Compose로 실행 (권장)

가장 간단한 방법입니다:

```powershell
# 컨테이너 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

앱이 http://localhost:8000 에서 실행됩니다.

### 2. Docker 명령어로 직접 실행

```powershell
# 이미지 빌드
docker build -t web-converter:latest .

# 컨테이너 실행
docker run -d -p 8000:8000 --name web-converter web-converter:latest

# 로그 확인
docker logs -f web-converter

# 중지 및 제거
docker stop web-converter
docker rm web-converter
```

## 설정 옵션

### 포트 변경

다른 포트로 실행하려면 `docker-compose.yml`을 수정하거나:

```powershell
docker run -d -p 9000:8000 --name web-converter web-converter:latest
```

### 환경 변수

`docker-compose.yml`에서 환경 변수를 설정할 수 있습니다:

```yaml
environment:
  - HOST=0.0.0.0
  - PORT=8000
  - LOG_LEVEL=DEBUG  # INFO, WARNING, ERROR, DEBUG
```

### 개발 모드

코드 변경사항을 실시간으로 반영하려면 `docker-compose.yml`의 volumes 섹션 주석을 해제하세요:

```yaml
volumes:
  - ./static:/app/static:ro
  - ./routes:/app/routes:ro
  # ... 나머지 볼륨들
```

## Health Check

컨테이너 상태 확인:

```powershell
# Health check 엔드포인트 호출
curl http://localhost:8000/health

# Docker health status 확인
docker ps
```

## 문제 해결

### 컨테이너가 시작되지 않는 경우

```powershell
# 로그 확인
docker-compose logs

# 또는
docker logs web-converter
```

### 포트가 이미 사용 중인 경우

다른 포트를 사용하거나 기존 서비스를 중지하세요:

```powershell
# 실행 중인 uvicorn 중지
# Ctrl+C 또는 프로세스 종료

# Docker Compose 포트 변경
# docker-compose.yml에서 "9000:8000" 으로 수정
```

### 이미지 재빌드

코드 변경 후 이미지를 다시 빌드하려면:

```powershell
docker-compose build --no-cache
docker-compose up -d
```

## 이미지 정보

- **Base Image**: python:3.13.7-slim
- **Python Version**: 3.13.7
- **Port**: 8000
- **User**: appuser (non-root)
- **Health Check**: /health 엔드포인트

## 유용한 명령어

```powershell
# 실행 중인 컨테이너 확인
docker ps

# 모든 컨테이너 확인 (중지된 것 포함)
docker ps -a

# 컨테이너 내부 접속
docker exec -it web-converter /bin/bash

# 리소스 사용량 확인
docker stats web-converter

# 이미지 삭제
docker rmi web-converter:latest

# 사용하지 않는 컨테이너/이미지 정리
docker system prune -a
```
