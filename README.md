# 📊 FI_UI5

[UI5] FI 모듈

SAP Fiori 기반의 재무(FI) 모듈 관련 UI5 애플리케이션입니다. 
각 프로젝트는 SAP S/4HANA 환경의 FI 기능을 확장하거나 시각화하는 데 초점을 맞추고 있습니다.

---

## 📁 프로젝트 구조

```
FI_UI5/
├── FI_financial_profit  # 손익계산서(Income Statement) 및 수익 시각화 기능
├── FI_gl_crud           # G/L 계정 관리 (생성, 수정, 삭제) 기능
├── .gitignore           # 공통 Git 무시 규칙
└── README.md            # 프로젝트 설명 문서
```

---

## 📦 기술 스택

- **SAP UI5 / Fiori**
- **OData V2**
- **SAP CDS View (백엔드)**
- **JSONModel / XML View**
- **Smart Controls (SmartTable, SmartFilterBar 등)**

---

## 📌 주요 기능

### `FI_financial_profit`
- 주차별 당기순이익 추이 시각화 (Waterfall Chart)
- 매출, 매출원가, 판관비 등 손익 항목 요약
- SAP SmartChart 및 SmartForm 기반의 분석 UI 구성

### `FI_gl_crud`
- G/L 계정 목록 조회, 생성, 수정, 삭제
- i18n 다국어 계정명 처리 (한/영/독어 등)
- SmartTable 및 Dialog 기반 CRUD UI

---

## 🚀 실행 방법 (로컬 개발용)

1. UI5 CLI 설치 (최초 1회)

```bash
npm install --global @ui5/cli
```

> 로컬 설치를 선호한다면:
> ```bash
> npm install --save-dev @ui5/cli
> ```

2. 프로젝트 의존성 설치

```bash
npm install
```

3. 로컬 서버 실행

```bash
ui5 serve -o
```

또는 `package.json`에 `start` 스크립트가 정의되어 있다면:

```bash
npm run start
```

4. 로컬 mock 서버 사용

`ui5.yaml`, `ui5-local.yaml`, `ui5-mock.yaml` 등을 활용하여 **mock 데이터 기반 개발**도 가능합니다.

---

## 📄 기타

- 모든 프로젝트는 **SAP UI5 / ABAP** 환경과의 연동을 고려하여 설계되었습니다.
- `node_modules/`, `dist/`, `mta_archives/` 등 **빌드 및 의존성 파일은 `.gitignore`에 포함**되어 있습니다.

---
## 👩‍💻 작성자

- [**주현정**](https://github.com/hyun-jung-joo)  
- **진소정**

SAP SYNC ACADEMY 6기 / ERP FI 모듈 개발 및 운영
