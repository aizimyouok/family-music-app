// 가족 음악 앱 - Google Apps Script Web App API (JSONP 방식 - CORS 완전 해결)
// 🔥 곡 순서(order) 기능 지원 버전

const ADMIN_PASSWORD = '748600';
const SHEET_ID = '1O23RTsYHRetHs59RHH1MB5MlQMPTSKKkhPJDoBf6-L8'; // 실제 구글 시트 ID로 변경

// GET 요청 처리 (JSONP 지원)
function doGet(e) {
  try {
    console.log('GET 요청 받음:', e.parameter);
    
    const action = e.parameter.action || 'test';
    const password = e.parameter.password || '';
    const callback = e.parameter.callback || e.parameter.jsonp;
    
    let result = {};
    
    switch(action) {
      case 'test':
        result = { 
          status: 'OK', 
          message: '🎉 JSONP 방식 연결 성공!', 
          timestamp: new Date().toISOString(),
          method: 'JSONP'
        };
        break;
        
      case 'getSongs':
        result = getSongs();
        break;
        
      case 'getFolders':
        result = getFolders();
        break;
        
      case 'addSong':
        if (!checkPassword(password)) {
          result = { error: '관리자 권한이 필요합니다.' };
          break;
        }
        const songData = {
          title: decodeURIComponent(e.parameter.title || ''),
          artist: decodeURIComponent(e.parameter.artist || '알 수 없는 아티스트'),
          youtubeId: e.parameter.youtubeId || '',
          folder: e.parameter.folder || 'general',
          duration: parseInt(e.parameter.duration) || 0,
          album: decodeURIComponent(e.parameter.album || '사용자 추가'),
          year: parseInt(e.parameter.year) || new Date().getFullYear(),
          order: parseInt(e.parameter.order) || 999, // 🔥 순서 필드 추가
          addedBy: 'User'
        };
        result = addSong(songData);
        break;
        
      case 'deleteSong':
        if (!checkPassword(password)) {
          result = { error: '관리자 권한이 필요합니다.' };
          break;
        }
        result = deleteSong(e.parameter.songId);
        break;
        
      case 'updateSong':
        if (!checkPassword(password)) {
          result = { error: '관리자 권한이 필요합니다.' };
          break;
        }
        const updates = {};
        if (e.parameter.title) updates.title = decodeURIComponent(e.parameter.title);
        if (e.parameter.artist) updates.artist = decodeURIComponent(e.parameter.artist);
        if (e.parameter.album) updates.album = decodeURIComponent(e.parameter.album);
        if (e.parameter.year) updates.year = parseInt(e.parameter.year);
        if (e.parameter.folder) updates.folder = e.parameter.folder;
        if (e.parameter.order) updates.order = parseInt(e.parameter.order); // 🔥 순서 필드 업데이트 지원
        result = updateSong(e.parameter.songId, updates);
        break;
        
      // 🔥 React 앱에서 호출하는 createFolder 액션 추가
      case 'createFolder':
        if (!checkPassword(password)) {
          result = { error: '관리자 권한이 필요합니다.' };
          break;
        }
        try {
          // React에서 전체 폴더 객체를 JSON으로 전송
          const folderData = {
            id: e.parameter.id || generateId('folder'),
            name: decodeURIComponent(e.parameter.name || ''),
            description: decodeURIComponent(e.parameter.description || ''),
            color: e.parameter.color || '#3b82f6',
            createdAt: e.parameter.createdAt || new Date().toISOString(),
            createdBy: e.parameter.createdBy || 'Admin'
          };
          result = createFolder(folderData);
        } catch (parseError) {
          console.error('createFolder 파라미터 파싱 오류:', parseError);
          result = { error: 'Invalid folder data: ' + parseError.toString() };
        }
        break;
        
      // 🔥 기존 addFolder도 유지 (호환성)
      case 'addFolder':
        if (!checkPassword(password)) {
          result = { error: '관리자 권한이 필요합니다.' };
          break;
        }
        const folderData2 = {
          name: decodeURIComponent(e.parameter.name || ''),
          description: decodeURIComponent(e.parameter.description || ''),
          color: e.parameter.color || '#3b82f6',
          createdBy: 'User'
        };
        result = addFolder(folderData2);
        break;
        
      case 'moveSongsToFolder':
        if (!checkPassword(password)) {
          result = { error: '관리자 권한이 필요합니다.' };
          break;
        }
        const songIds = JSON.parse(decodeURIComponent(e.parameter.songIds || '[]'));
        result = moveSongsToFolder(songIds, e.parameter.folderId);
        break;
        
      // 🔥 단일 곡 폴더 이동을 위한 새 액션
      case 'moveSongToFolder':
        if (!checkPassword(password)) {
          result = { error: '관리자 권한이 필요합니다.' };
          break;
        }
        result = updateSong(e.parameter.songId, { folder: e.parameter.folderId });
        break;
        
      case 'checkPassword':
        result = { valid: checkPassword(password) };
        break;
        
      default:
        result = { error: '지원되지 않는 액션입니다.', action: action };
    }
    
    // 성공 로그
    console.log('처리 완료:', action, result);
    
    // JSONP 응답 생성
    if (callback) {
      const jsonpResponse = callback + '(' + JSON.stringify(result) + ');';
      return ContentService.createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      // 일반 JSON 응답 (브라우저에서 직접 접속 시)
      return ContentService.createTextOutput(JSON.stringify(result, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    console.error('API 오류:', error);
    const errorResult = { 
      error: error.toString(),
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    const callback = e.parameter.callback || e.parameter.jsonp;
    if (callback) {
      const jsonpResponse = callback + '(' + JSON.stringify(errorResult) + ');';
      return ContentService.createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(JSON.stringify(errorResult, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
}

// 비밀번호 확인
function checkPassword(password) {
  return password === ADMIN_PASSWORD;
}

// 구글 시트 접근
function getSheet(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      initializeSheet(sheet, sheetName);
      console.log(`새 시트 생성됨: ${sheetName}`);
    }
    
    return sheet;
  } catch (error) {
    console.error(`시트 접근 오류 (${sheetName}):`, error);
    throw new Error(`시트 접근 실패: ${error.toString()}`);
  }
}

// 시트 초기화
function initializeSheet(sheet, sheetName) {
  if (sheetName === 'songs') {
    // 🔥 order 컬럼 추가 (folder 다음에 위치)
    sheet.getRange(1, 1, 1, 11).setValues([[
      'id', 'title', 'artist', 'youtubeId', 'folder', 'order',
      'duration', 'album', 'year', 'addedAt', 'addedBy'
    ]]);
    console.log('songs 시트 헤더 생성됨 (order 컬럼 포함)');
  } else if (sheetName === 'folders') {
    sheet.getRange(1, 1, 1, 7).setValues([[
      'id', 'name', 'description', 'color', 'createdAt', 'createdBy', 'songCount'
    ]]);
    
    // 기본 폴더 추가
    const defaultFolders = [
      ['all', '전체', '모든 음악', '#6b7280', new Date().toISOString(), 'System', 0],
      ['general', '일반', '일반 음악', '#3b82f6', new Date().toISOString(), 'System', 0],
      ['favorites', '즐겨찾기', '좋아하는 음악', '#ef4444', new Date().toISOString(), 'System', 0],
      ['kpop', 'K-POP', '한국 음악', '#8b5cf6', new Date().toISOString(), 'System', 0]
    ];
    
    sheet.getRange(2, 1, defaultFolders.length, 7).setValues(defaultFolders);
    console.log('기본 폴더 4개 생성됨');
  }
}

// 🔥 곡 목록 조회 (순서 정렬 지원)
function getSongs() {
  try {
    const sheet = getSheet('songs');
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      console.log('곡 목록이 비어있음');
      return { songs: [] };
    }
    
    const headers = data[0];
    const songs = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // ID가 없는 빈 행 건너뛰기
      
      const song = {};
      headers.forEach((header, index) => {
        song[header] = row[index] || '';
      });
      
      // 🔥 order 필드가 없으면 기본값 설정
      if (!song.order || song.order === '') {
        song.order = 999;
      } else {
        song.order = parseInt(song.order) || 999;
      }
      
      // YouTube 썸네일 추가
      if (song.youtubeId) {
        song.artwork = `https://img.youtube.com/vi/${song.youtubeId}/maxresdefault.jpg`;
      }
      
      songs.push(song);
    }
    
    // 🔥 폴더별, 순서별로 정렬
    songs.sort((a, b) => {
      // 먼저 폴더별로 그룹화
      if (a.folder !== b.folder) {
        return a.folder.localeCompare(b.folder);
      }
      // 같은 폴더 내에서는 order 순으로 정렬
      return (a.order || 999) - (b.order || 999);
    });
    
    console.log(`곡 목록 조회 완료: ${songs.length}곡 (순서 정렬 적용)`);
    return { songs: songs };
    
  } catch (error) {
    console.error('곡 목록 조회 오류:', error);
    return { error: error.toString() };
  }
}

// 폴더 목록 조회
function getFolders() {
  try {
    const sheet = getSheet('folders');
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      console.log('폴더 목록이 비어있음 - 기본 폴더 생성');
      initializeSheet(sheet, 'folders');
      return getFolders(); // 재귀 호출
    }
    
    const headers = data[0];
    const folders = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // ID가 없는 빈 행 건너뛰기
      
      const folder = {};
      headers.forEach((header, index) => {
        folder[header] = row[index] || '';
      });
      
      folders.push(folder);
    }
    
    // 폴더별 곡 수 업데이트
    updateFolderSongCounts(folders);
    
    console.log(`폴더 목록 조회 완료: ${folders.length}개`);
    return { folders: folders };
    
  } catch (error) {
    console.error('폴더 목록 조회 오류:', error);
    return { error: error.toString() };
  }
}

// 🔥 곡 추가 (order 필드 지원)
function addSong(songData) {
  try {
    const sheet = getSheet('songs');
    
    const newId = generateId('song');
    const timestamp = new Date().toISOString();
    
    // 🔥 해당 폴더의 마지막 순서 계산
    let nextOrder = 1;
    if (songData.folder && songData.folder !== 'all') {
      const existingSongs = getSongs();
      if (!existingSongs.error) {
        const folderSongs = existingSongs.songs.filter(song => song.folder === songData.folder);
        if (folderSongs.length > 0) {
          const maxOrder = Math.max(...folderSongs.map(song => parseInt(song.order) || 0));
          nextOrder = maxOrder + 1;
        }
      }
    }
    
    const newSong = {
      id: newId,
      title: songData.title || '',
      artist: songData.artist || '알 수 없는 아티스트',
      youtubeId: songData.youtubeId || '',
      folder: songData.folder || 'general',
      order: songData.order || nextOrder, // 🔥 순서 필드 추가
      duration: songData.duration || 0,
      album: songData.album || '사용자 추가',
      year: songData.year || new Date().getFullYear(),
      addedAt: timestamp,
      addedBy: songData.addedBy || 'User'
    };
    
    sheet.appendRow([
      newSong.id, newSong.title, newSong.artist, newSong.youtubeId, newSong.folder, newSong.order,
      newSong.duration, newSong.album, newSong.year, newSong.addedAt, newSong.addedBy
    ]);
    
    console.log(`곡 추가 완료: ${newSong.title} (순서: ${newSong.order})`);
    return { success: true, song: newSong };
    
  } catch (error) {
    console.error('곡 추가 오류:', error);
    return { error: error.toString() };
  }
}

// 🔥 곡 수정 (order 필드 지원)
function updateSong(songId, updates) {
  try {
    const sheet = getSheet('songs');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === songId) {
        Object.keys(updates).forEach(key => {
          const colIndex = headers.indexOf(key);
          if (colIndex >= 0) {
            let value = updates[key];
            // 🔥 order 필드는 숫자로 변환
            if (key === 'order') {
              value = parseInt(value) || 999;
            }
            sheet.getRange(i + 1, colIndex + 1).setValue(value);
          }
        });
        
        console.log(`곡 수정 완료: ${songId}`, updates);
        return { success: true, updates: updates };
      }
    }
    
    return { error: '곡을 찾을 수 없습니다.' };
    
  } catch (error) {
    console.error('곡 수정 오류:', error);
    return { error: error.toString() };
  }
}

// 곡 삭제
function deleteSong(songId) {
  try {
    const sheet = getSheet('songs');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === songId) {
        sheet.deleteRow(i + 1);
        console.log(`곡 삭제 완료: ${songId}`);
        return { success: true };
      }
    }
    
    return { error: '곡을 찾을 수 없습니다.' };
    
  } catch (error) {
    console.error('곡 삭제 오류:', error);
    return { error: error.toString() };
  }
}

// 🔥 새 폴더 생성 함수 (React 앱과 호환)
function createFolder(folderData) {
  try {
    const sheet = getSheet('folders');
    
    // 중복 폴더명 체크
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === folderData.name) {
        return { error: '이미 존재하는 폴더 이름입니다.' };
      }
    }
    
    const newFolder = {
      id: folderData.id || generateId('folder'),
      name: folderData.name || '',
      description: folderData.description || '',
      color: folderData.color || '#3b82f6',
      createdAt: folderData.createdAt || new Date().toISOString(),
      createdBy: folderData.createdBy || 'Admin',
      songCount: 0
    };
    
    sheet.appendRow([
      newFolder.id, newFolder.name, newFolder.description, newFolder.color,
      newFolder.createdAt, newFolder.createdBy, newFolder.songCount
    ]);
    
    console.log(`폴더 생성 완료: ${newFolder.name} (ID: ${newFolder.id})`);
    return { success: true, folder: newFolder };
    
  } catch (error) {
    console.error('폴더 생성 오류:', error);
    return { error: error.toString() };
  }
}

// 🔥 기존 폴더 추가 함수 (호환성 유지)
function addFolder(folderData) {
  try {
    const sheet = getSheet('folders');
    
    const newId = generateId('folder');
    const timestamp = new Date().toISOString();
    
    const newFolder = {
      id: newId,
      name: folderData.name || '',
      description: folderData.description || '',
      color: folderData.color || '#3b82f6',
      createdAt: timestamp,
      createdBy: folderData.createdBy || 'User',
      songCount: 0
    };
    
    sheet.appendRow([
      newFolder.id, newFolder.name, newFolder.description, newFolder.color,
      newFolder.createdAt, newFolder.createdBy, newFolder.songCount
    ]);
    
    console.log(`폴더 추가 완료: ${newFolder.name}`);
    return { success: true, folder: newFolder };
    
  } catch (error) {
    console.error('폴더 추가 오류:', error);
    return { error: error.toString() };
  }
}

// 곡들을 폴더로 이동
function moveSongsToFolder(songIds, folderId) {
  try {
    const sheet = getSheet('songs');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const folderColIndex = headers.indexOf('folder');
    
    if (folderColIndex < 0) {
      return { error: 'folder 열을 찾을 수 없습니다.' };
    }
    
    let movedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (songIds.includes(data[i][0])) {
        sheet.getRange(i + 1, folderColIndex + 1).setValue(folderId);
        movedCount++;
      }
    }
    
    console.log(`${movedCount}곡을 ${folderId} 폴더로 이동 완료`);
    return { success: true, movedCount: movedCount };
    
  } catch (error) {
    console.error('곡 이동 오류:', error);
    return { error: error.toString() };
  }
}

// 폴더별 곡 수 업데이트
function updateFolderSongCounts(folders) {
  try {
    const songsResult = getSongs();
    if (songsResult.error) return;
    
    const songs = songsResult.songs;
    const folderCounts = {};
    
    // 전체 곡 수
    folderCounts['all'] = songs.length;
    
    // 폴더별 곡 수 계산
    songs.forEach(song => {
      const folderId = song.folder || 'general';
      folderCounts[folderId] = (folderCounts[folderId] || 0) + 1;
    });
    
    // 폴더 객체에 곡 수 업데이트
    folders.forEach(folder => {
      folder.songCount = folderCounts[folder.id] || 0;
    });
    
  } catch (error) {
    console.error('폴더 곡 수 업데이트 오류:', error);
  }
}

// ID 생성
function generateId(prefix) {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}_${timestamp}_${random}`;
}

// 🔥 수동으로 기존 곡들에 order 값 부여하는 헬퍼 함수 (한 번만 실행)
function assignOrderToExistingSongs() {
  try {
    const sheet = getSheet('songs');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const folderColIndex = headers.indexOf('folder');
    const orderColIndex = headers.indexOf('order');
    
    if (orderColIndex < 0) {
      console.error('order 컬럼을 찾을 수 없습니다. 먼저 시트에 order 컬럼을 추가하세요.');
      return;
    }
    
    // 폴더별로 그룹화
    const folderGroups = {};
    
    for (let i = 1; i < data.length; i++) {
      const folder = data[i][folderColIndex] || 'general';
      if (!folderGroups[folder]) {
        folderGroups[folder] = [];
      }
      folderGroups[folder].push(i + 1); // 실제 행 번호 (1-based)
    }
    
    // 각 폴더별로 순서 부여
    Object.keys(folderGroups).forEach(folder => {
      const rows = folderGroups[folder];
      rows.forEach((row, index) => {
        sheet.getRange(row, orderColIndex + 1).setValue(index + 1);
      });
      console.log(`${folder} 폴더: ${rows.length}곡에 순서 부여 완료`);
    });
    
    console.log('✅ 기존 곡들에 order 값 부여 완료');
    
  } catch (error) {
    console.error('기존 곡 순서 부여 오류:', error);
  }
}
