# 작업 하네스

이 저장소의 하네스는 작업 맥락 → 변경 → 자동 검사 → 화면 검수 → 인계가 반복 가능하도록 구성한다.

## 실행

Node.js 22 이상과 Python 3.10 이상을 사용한다. 외부 패키지 설치는 필요 없다.

```sh
npm run dev
# http://127.0.0.1:8000
```

```sh
npm run check
# 또는 npm test
```

자동 검사는 HTML의 로컬 참조와 앵커, 중복 ID, 접근성 연결, 이미지 alt, 구조화 데이터, FAQ 본문과 JSON-LD 일치, canonical·OG·sitemap·robots 주소 일치, 자리표시자, JS 구문을 확인한다. 외부 링크 접속, 동적으로 조립된 이미지 경로 전체, 브라우저 동작·색 대비·시각적 품질은 검사하지 않는다.

## 문서 탐색

- `AGENTS.md`: 에이전트가 시작할 때 읽는 작업 규칙
- `DESIGN_HANDOFF.md`: 디자이너에게 전달할 현재 맥락
- `CONCEPT.md`, `FEEDBACK.md`: 과거 결정과 변경 이유
- `docs/harness/REVIEW.md`: 브라우저 검수 시나리오
- `docs/harness/TASK_TEMPLATE.md`: 긴 작업의 목표·진행·증거·다음 단계 기록

## CI와 배포

PR과 main push에서 `.github/workflows/check.yml`이 동일한 검사를 실행한다. 배포 워크플로 자체도 서버 접속 전에 검사를 실행해 실패 시 배포를 중단한다. 브랜치 보호와 필수 상태 검사 설정은 저장소 관리자 설정에서 별도로 적용해야 한다.

자동 검사가 성공해도 화면 검수가 완료된 것은 아니다. UI 변경은 REVIEW.md의 관련 시나리오를 실행하고, 수행 환경과 결과를 작업 기록 또는 PR에 남긴다. 외부 CDN에 의존하는 폰트·QR·3D는 인터넷 연결이 필요하다.
