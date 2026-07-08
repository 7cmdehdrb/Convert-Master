이 레포에서는 **`static/favicon.ico`에 파일을 두고, 각 HTML의 `<head>`에 favicon 링크를 추가**하면 됩니다.

현재 FastAPI가 `static` 폴더를 `/static` 경로로 서빙하고 있습니다. 즉 `static/favicon.ico`는 브라우저에서 `/static/favicon.ico`로 접근됩니다.

추가할 위치는 여기입니다.

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link rel="icon" href="/static/favicon.ico" type="image/x-icon">

    ...
</head>
```

적용해야 하는 파일은 현재 HTML 페이지 3개입니다.

```text
static/index.html
static/pdf-to-image.html
static/system-recorder.html
```

이 3개가 실제 페이지 HTML입니다.

`static/components/header.html`에는 넣으면 안 됩니다. 거기는 `<head>`가 아니라 화면 상단 UI용 `<header>` 조각이라 favicon 인식 위치가 아닙니다.

권장 구조는 이렇게입니다.

```text
static/
  favicon.ico
  index.html
  pdf-to-image.html
  system-recorder.html
```

그리고 각 HTML의 `<head>` 안에:

```html
<link rel="icon" href="/static/favicon.ico" type="image/x-icon">
```

SVG를 쓸 거면:

```text
static/favicon.svg
```

```html
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
```

참고로 브라우저는 기본적으로 `/favicon.ico`도 찾지만, 이 앱은 `/static`만 정적 파일로 마운트되어 있어서 그냥 루트에 favicon을 기대하면 안 됩니다. 명시적으로 `/static/favicon.ico`를 지정하는 방식이 가장 깔끔합니다.
