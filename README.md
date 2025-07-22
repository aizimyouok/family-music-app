# 🎵 가족 음악 앱 - GitHub 저장소 기반

> **YouTube 기반 가족 전용 음악 스트리밍 앱 (아티스트별 폴더 구조)**

![React](https://img.shields.io/badge/React-19.1.0-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-7.0.4-purple?logo=vite)
![GitHub](https://img.shields.io/badge/Data-GitHub-green?logo=github)

---

## 📋 **프로젝트 개요**

**YouTube API 기반 가족 전용 음악 스트리밍 앱**
- **기술 스택**: React 19 + Vite + YouTube API + Phosphor Icons
- **데이터 저장**: GitHub 저장소 기반 + localStorage 백업
- **구조**: 아티스트별 폴더로 체계적 관리
- **주요 기능**: 음악 재생/관리, 완전한 플레이어 컨트롤, 아티스트별 필터링

---

## 🏗️ **새로운 폴더 구조**

```
family-music-app/
├── data/                           # 📊 모든 음악 데이터
│   ├── artists.json               # 🎭 아티스트 목록 & 메타데이터
│   ├── userdata.json             # 👤 사용자 설정 & 플레이리스트
│   └── artists/                   # 📁 아티스트별 폴더
│       ├── 아이유/
│       │   └── songs.json        # 🎵 아이유 곡 목록
│       ├── BTS/
│       │   └── songs.json        # 🎵 BTS 곡 목록
│       ├── NewJeans/
│       │   └── songs.json        # 🎵 NewJeans 곡 목록
│       └── [새 아티스트]/
│           └── songs.json        # 🎵 새 아티스트 곡 목록
├── src/
│   ├── App.jsx                   # ⚛️ 메인 애플리케이션
│   ├── App.css                   # 🎨 추가 스타일
│   ├── index.css                 # 🎨 메인 스타일시트
│   └── main.jsx                  # ⚛️ React 엔트리 포인트
└── public/
    └── musicList.json            # 🗃️ 레거시 파일 (사용 안함)
```

---

## 🎯 **주요 개선사항**

### 🌐 **GitHub 기반 데이터 관리**
- ✅ **중앙화된 데이터**: 모든 곡 목록이 GitHub에 저장
- ✅ **실시간 동기화**: 앱 시작 시 최신 데이터 자동 로드
- ✅ **백업 시스템**: localStorage로 오프라인 백업

### 📁 **아티스트별 폴더 구조**
- ✅ **체계적 관리**: 각 아티스트마다 전용 폴더
- ✅ **확장성**: 새 아티스트 쉽게 추가 가능
- ✅ **필터링**: 아티스트별 곡 목록 보기

### 🎵 **향상된 UI/UX**
- ✅ **아티스트 필터**: 전체/사용자추가/아티스트별 보기
- ✅ **상태 표시**: 깃허브 연결 상태 실시간 표시
- ✅ **상세 정보**: 앨범, 연도, 장르 정보 표시

---

## 🚀 **설치 및 실행**

```bash
# 1. 프로젝트 클론
git clone https://github.com/aizimyouok/family-music-app.git
cd family-music-app

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev

# 4. 브라우저에서 접속
# http://localhost:5173
```

---

## 📝 **새 아티스트/곡 추가 방법**

### 🎭 **새 아티스트 추가**

1. **폴더 생성**: `data/artists/새아티스트명/` 
2. **곡 목록 파일**: `data/artists/새아티스트명/songs.json`
3. **아티스트 목록 업데이트**: `data/artists.json`에 새 아티스트 정보 추가

#### 예시: 새 아티스트 추가

**1. 폴더 생성**
```
data/artists/에스파/
```

**2. 곡 목록 파일 작성** (`data/artists/에스파/songs.json`)
```json
[
  {
    "id": "aespa_001",
    "title": "Next Level",
    "artist": "에스파",
    "youtubeId": "4TWR90KJl84",
    "duration": 210,
    "album": "Next Level",
    "year": 2021,
    "genre": "K-pop",
    "addedAt": "2025-07-22T00:00:00Z",
    "isDefault": true
  }
]
```

**3. 아티스트 목록 업데이트** (`data/artists.json`)
```json
{
  "artists": [
    // ... 기존 아티스트들
    {
      "id": "aespa",
      "name": "에스파",
      "englishName": "aespa",
      "genre": "K-pop",
      "debut": "2020",
      "agency": "SM Entertainment",
      "description": "대한민국의 4인조 여성 아이돌 그룹",
      "avatar": "https://img.youtube.com/vi/4TWR90KJl84/maxresdefault.jpg",
      "songCount": 1,
      "folder": "에스파"
    }
  ]
}
```

### 🎵 **기존 아티스트에 곡 추가**

해당 아티스트의 `songs.json` 파일에 새 곡 정보 추가:

```json
{
  "id": "unique_song_id",
  "title": "곡 제목",
  "artist": "아티스트명",
  "youtubeId": "YouTube_Video_ID",
  "duration": 180,
  "album": "앨범명",
  "year": 2024,
  "genre": "K-pop",
  "addedAt": "2025-07-22T00:00:00Z",
  "isDefault": true
}
```

---

## 🌟 **데이터 구조 설명**

### 📋 **artists.json** - 아티스트 메타데이터
```json
{
  "artists": [
    {
      "id": "iu",                    // 고유 ID (영문)
      "name": "아이유",               // 표시명
      "englishName": "IU",           // 영문명
      "genre": "K-pop",              // 장르
      "debut": "2008",               // 데뷔년도
      "agency": "EDAM Entertainment", // 소속사
      "description": "설명",          // 간단 설명
      "avatar": "이미지URL",          // 대표 이미지
      "songCount": 2,                // 곡 수
      "folder": "아이유"              // 폴더명
    }
  ],
  "lastUpdated": "2025-07-22T00:00:00Z",
  "version": "1.0.0"
}
```

### 🎵 **songs.json** - 곡 목록
```json
[
  {
    "id": "iu_001",                  // 고유 곡 ID
    "title": "좋은 날",              // 곡 제목
    "artist": "아이유",              // 아티스트명
    "youtubeId": "jeqdYqsrsA0",     // YouTube 비디오 ID
    "duration": 237,                // 재생 시간 (초)
    "album": "Real",                // 앨범명
    "year": 2010,                   // 발매년도
    "genre": "K-pop",               // 장르
    "addedAt": "2025-01-01T00:00:00Z", // 추가일시
    "isDefault": true               // 기본 제공 곡 여부
  }
]
```

---

## ✨ **주요 기능**

### 🎵 **완전한 음악 플레이어**
- ▶️ 재생/일시정지, ⏭️ 이전/다음 곡
- 🔀 셔플 모드, 🔁 반복 모드 (없음/전체/한 곡)
- 📊 실시간 진행바 + 시간 표시
- 🔊 볼륨 조절 (0-100%)

### 🎛️ **음악 관리**
- ➕ YouTube URL로 음악 추가
- ✏️ 곡 제목/아티스트 편집 (사용자 추가 곡만)
- 🗑️ 곡 삭제 (사용자 추가 곡만)
- 🔍 실시간 검색 (제목/아티스트)
- ☑️ 다중 선택 후 재생

### 🎭 **아티스트별 관리**
- 📁 아티스트별 폴더 구조
- 🔽 아티스트별 필터링
- 📊 아티스트별 곡 수 표시
- ✨ 사용자 추가 곡 분리 관리

### 🎨 **고급 UI/UX**
- 🌙 다크 테마 디자인
- 📱 완전한 반응형 (모바일/태블릿/데스크탑)
- 🖼️ 16:9 비율 앨범 아트
- ✨ 펄스 글로우 + 그라디언트 웨이브 효과
- 🎭 Phosphor React 아이콘

### 💾 **데이터 저장**
- 🌐 GitHub 저장소 기반 중앙 데이터
- 💽 localStorage 백업 시스템
- 🔄 자동 동기화 + 상태 표시

---

## 🔧 **기술 스택**

- **Frontend**: React 19.1.0 + Vite 7.0.4
- **UI 라이브러리**: Phosphor React Icons
- **비디오 플레이어**: react-youtube
- **데이터 저장**: GitHub Raw + localStorage
- **스타일링**: CSS3 + CSS Grid/Flexbox

---

## 🛠️ **개발 스크립트**

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 미리보기
npm run lint     # ESLint 검사
```

---

## 🚀 **배포 방법**

### GitHub Pages 배포
```bash
npm run build
# dist 폴더를 GitHub Pages에 배포
```

### Netlify 배포
1. GitHub 저장소 연결
2. Build Command: `npm run build`
3. Publish Directory: `dist`

---

## 📈 **향후 계획**

- [ ] 🎛️ **이퀄라이저** - 음질 조절
- [ ] 💾 **재생 기록 & 즐겨찾기** - 스마트 관리
- [ ] 🌙 **테마 시스템** - 다크/라이트 전환
- [ ] 📱 **PWA 앱화** - 스마트폰에 설치 가능
- [ ] 🎵 **자동 가사 표시** - Lyrics API 연동
- [ ] 🔊 **실시간 함께 듣기** - 가족 동시 재생
- [ ] 🤖 **자동 음악 추천** - AI 기반 추천

---

## 🤝 **기여하기**

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 **라이센스**

이 프로젝트는 MIT 라이센스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

---

## 🎉 **완성된 YouTube 기반 가족 음악 앱!**

**🌟 GitHub 저장소 기반으로 어디서든 접근 가능한 음악 앱** 🎵

---

*Made with ❤️ for Family Music Experience*