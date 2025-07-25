import { useEffect, useState, useRef, useCallback } from "react";
import YouTube from 'react-youtube';
import { 
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, RepeatOnce, 
  SpeakerHigh, Plus, Link, Cloud, CloudSlash, PencilSimple, Trash, 
  Check, X, Folder, MusicNote, Gear, User, UserGear, Key, FolderPlus,
  ArrowRight, Database, Warning
} from "phosphor-react";
import "./App.css";

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbYEhOKSxNDH7FjFDooM3cRXR1-F1UTwfSBjik3FxCJDAxeGYycXaSnndoJSaplW-5/exec';
const ADMIN_PASSWORD_KEY = 'family_music_admin_password';

// YouTube Data API v3 키 (개발용 - 실제 배포시에는 서버리스 함수로 보호 필요)
// 🔑 여기에 본인의 YouTube API 키를 입력하세요
const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY_HERE';

// 폴더 색상 팔레트
const FOLDER_COLORS = [
  '#3b82f6', // 파란색
  '#10b981', // 녹색
  '#f59e0b', // 주황색  
  '#ef4444', // 빨간색
  '#8b5cf6', // 보라색
  '#06b6d4', // 시안색
  '#84cc16', // 라임색
  '#f97316', // 오렌지색
  '#ec4899', // 핑크색
  '#6366f1', // 인디고색
];

function App() {
  const [musicList, setMusicList] = useState([]);
  const [folderList, setFolderList] = useState([]);
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentMusic, setCurrentMusic] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('all');
  
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [selectedFolderForNew, setSelectedFolderForNew] = useState('general');
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');
  
  const [cloudStatus, setCloudStatus] = useState('disconnected');
  const [lastSync, setLastSync] = useState(null);
  
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6');
  
  // 곡 이동 관련 상태
  const [selectedSongs, setSelectedSongs] = useState(new Set());
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetFolder, setTargetFolder] = useState('');
  
  // 선택 재생 관련 상태 (일반 모드에서도 사용)
  const [selectedSongsForPlay, setSelectedSongsForPlay] = useState(new Set());
  const [isSelectivePlayMode, setIsSelectivePlayMode] = useState(false); // 선택 재생 모드인지
  const [showSongEditDialog, setShowSongEditDialog] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  
  // 새로 추가된 상태들
  const [draggedSong, setDraggedSong] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [showSkeletonUI, setShowSkeletonUI] = useState(false);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false); // 미니 플레이어 상태
  
  // 곡 순서 변경 관련 상태
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [originalPlaylistOrder, setOriginalPlaylistOrder] = useState([]);
  
  const playerRef = useRef(null);
  const progressInterval = useRef(null);
  const musicListRef = useRef(null);
  const bottomSheetRef = useRef(null);

  const initializeApp = async () => {
    setLoading(true);
    const savedPassword = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
    if (savedPassword) {
      const isValid = await checkAdminPassword(savedPassword, false);
      if (isValid) {
        setIsAdminMode(true);
        setAdminPassword(savedPassword);
      }
    }
    await loadAllData();
  };

  // 화면 크기 감지
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 키보드 단축키 처리 - 의존성 최소화
  const handleKeyPress = useCallback((e) => {
    // 입력 필드에서 타이핑 중일 때는 단축키 비활성화
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        // 현재 상태를 실시간으로 가져와서 사용
        setIsPlaying(currentIsPlaying => {
          if (currentIsPlaying) {
            if (playerRef.current) playerRef.current.pauseVideo();
          } else {
            if (playerRef.current) playerRef.current.playVideo();
          }
          return currentIsPlaying; // 상태는 실제로 변경하지 않음 (YouTube API가 처리)
        });
        break;
      case 'ArrowRight':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          // nextSong 로직 간소화
          setCurrentIndex(prevIndex => {
            setCurrentPlaylist(currentList => {
              if (currentList.length === 0) return currentList;
              const nextIndex = (prevIndex + 1) % currentList.length;
              if (currentList[nextIndex]) {
                const song = currentList[nextIndex];
                setCurrentMusic(song);
                if (playerRef.current) {
                  setTimeout(() => {
                    playerRef.current.loadVideoById(song.youtubeId);
                    setTimeout(() => playerRef.current?.playVideo(), 2000);
                  }, 100);
                }
              }
              return currentList;
            });
            return (prevIndex + 1) % (currentPlaylist.length || 1);
          });
        }
        break;
      case 'ArrowLeft':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          // prevSong 로직 간소화
          setCurrentIndex(prevIndex => {
            setCurrentPlaylist(currentList => {
              if (currentList.length === 0) return currentList;
              const newPrevIndex = (prevIndex - 1 + currentList.length) % currentList.length;
              if (currentList[newPrevIndex]) {
                const song = currentList[newPrevIndex];
                setCurrentMusic(song);
                if (playerRef.current) {
                  setTimeout(() => {
                    playerRef.current.loadVideoById(song.youtubeId);
                    setTimeout(() => playerRef.current?.playVideo(), 2000);
                  }, 100);
                }
              }
              return currentList;
            });
            return Math.max(0, (prevIndex - 1 + (currentPlaylist.length || 1)) % (currentPlaylist.length || 1));
          });
        }
        break;
      case 'ArrowUp':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setVolume(prevVolume => {
            const newVolume = Math.min(100, prevVolume + 10);
            if (playerRef.current) playerRef.current.setVolume(newVolume);
            return newVolume;
          });
        }
        break;
      case 'ArrowDown':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setVolume(prevVolume => {
            const newVolume = Math.max(0, prevVolume - 10);
            if (playerRef.current) playerRef.current.setVolume(newVolume);
            return newVolume;
          });
        }
        break;
      case 'KeyS':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setIsShuffle(prev => !prev);
        }
        break;
      case 'KeyR':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setRepeatMode(prevMode => {
            const modes = ['none', 'all', 'one'];
            return modes[(modes.indexOf(prevMode) + 1) % modes.length];
          });
        }
        break;
    }
  }, []); // 의존성 배열을 비워서 한 번만 생성

  // 터치/스와이프 제스처 처리
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now()
    });
  };

  const handleTouchMove = (e) => {
    if (!touchStart) return;
    
    const currentTouch = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
    
    const deltaX = currentTouch.x - touchStart.x;
    const deltaY = currentTouch.y - touchStart.y;
    
    // Pull to refresh 완전히 비활성화
    // 스와이프 제스처만 유지
    
    setTouchEnd(currentTouch);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;
    
    // 스와이프 제스처 감지 (빠른 스와이프만)
    if (deltaTime < 300 && Math.abs(deltaX) > 100 && Math.abs(deltaY) < 80) {
      if (deltaX > 0) {
        // 오른쪽 스와이프 - 이전 곡
        setSwipeDirection('right');
        // 간단한 이전 곡 로직
        setCurrentIndex(prevIndex => {
          setCurrentPlaylist(currentList => {
            if (currentList.length > 0) {
              const prevIdx = (prevIndex - 1 + currentList.length) % currentList.length;
              const song = currentList[prevIdx];
              if (song) {
                setCurrentMusic(song);
                if (playerRef.current) {
                  setTimeout(() => {
                    playerRef.current.loadVideoById(song.youtubeId);
                    setTimeout(() => playerRef.current?.playVideo(), 2000);
                  }, 100);
                }
              }
            }
            return currentList;
          });
          return Math.max(0, (prevIndex - 1 + (currentPlaylist.length || 1)) % (currentPlaylist.length || 1));
        });
        setTimeout(() => setSwipeDirection(null), 500);
      } else {
        // 왼쪽 스와이프 - 다음 곡
        setSwipeDirection('left');
        // 간단한 다음 곡 로직
        setCurrentIndex(prevIndex => {
          setCurrentPlaylist(currentList => {
            if (currentList.length > 0) {
              const nextIndex = (prevIndex + 1) % currentList.length;
              const song = currentList[nextIndex];
              if (song) {
                setCurrentMusic(song);
                if (playerRef.current) {
                  setTimeout(() => {
                    playerRef.current.loadVideoById(song.youtubeId);
                    setTimeout(() => playerRef.current?.playVideo(), 2000);
                  }, 100);
                }
              }
            }
            return currentList;
          });
          return (prevIndex + 1) % (currentPlaylist.length || 1);
        });
        setTimeout(() => setSwipeDirection(null), 500);
      }
    }
    
    // 상태 리셋
    setTouchStart(null);
    setTouchEnd(null);
  };

  // 드래그 앤 드롭 핸들러들
  const handleDragStart = (e, song, index) => {
    if (!isAdminMode) return;
    
    setDraggedSong({ song, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    
    // 드래그 이미지 커스터마이징
    const dragImage = e.target.cloneNode(true);
    dragImage.classList.add('drag-ghost');
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, e.target.offsetWidth / 2, e.target.offsetHeight / 2);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragOver = (e, index) => {
    if (!draggedSong) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (!draggedSong || draggedSong.index === dropIndex) {
      setDraggedSong(null);
      setDragOverIndex(null);
      return;
    }
    
    // 배열 순서 변경
    const newPlaylist = [...currentPlaylist];
    const [removed] = newPlaylist.splice(draggedSong.index, 1);
    newPlaylist.splice(dropIndex, 0, removed);
    
    setCurrentPlaylist(newPlaylist);
    
    // 순서 변경 감지
    const orderChanged = !arraysEqual(newPlaylist, originalPlaylistOrder);
    setHasOrderChanges(orderChanged);
    
    // 현재 재생 중인 곡의 인덱스 업데이트
    if (currentMusic) {
      const newCurrentIndex = newPlaylist.findIndex(song => song.id === currentMusic.id);
      setCurrentIndex(newCurrentIndex);
    }
    
    setDraggedSong(null);
    setDragOverIndex(null);
    
    console.log('🔄 곡 순서 변경됨:', {
      from: draggedSong.index,
      to: dropIndex,
      hasChanges: orderChanged
    });
  };

  // 배열 비교 함수
  const arraysEqual = (arr1, arr2) => {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((item, index) => item.id === arr2[index].id);
  };

  // 곡 순서 저장 함수
  const savePlaylistOrder = async () => {
    if (!hasOrderChanges) {
      alert('변경된 순서가 없습니다.');
      return;
    }

    setIsSavingOrder(true);
    
    try {
      // 순서 정보를 포함한 곡 리스트 생성
      const songsWithOrder = currentPlaylist.map((song, index) => ({
        ...song,
        order: index + 1,
        lastOrderUpdate: new Date().toISOString()
      }));

      // 🌐 구글 시트에 순서 정보 저장 (기존 updateSong API 활용)
      if (cloudStatus === 'connected' || cloudStatus === 'syncing') {
        setCloudStatus('syncing');
        
        console.log('💾 구글 시트에 곡 순서 저장 중...', {
          folder: selectedFolder,
          songCount: songsWithOrder.length
        });
        
        // 각 곡의 순서 정보를 개별적으로 업데이트
        let successCount = 0;
        let failCount = 0;
        
        for (const song of songsWithOrder) {
          try {
            const response = await callGoogleAPI('updateSong', {
              songId: song.id,
              title: song.title,
              artist: song.artist,
              album: song.album,
              year: song.year,
              folder: song.folder,
              order: song.order, // 순서 정보 추가
              updatedAt: new Date().toISOString()
            });
            
            if (response.error) {
              console.error('곡 순서 업데이트 실패:', song.title, response.error);
              failCount++;
            } else {
              successCount++;
            }
            
            // API 호출 간격 조절 (너무 빠른 요청 방지)
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (songError) {
            console.error('곡 개별 업데이트 실패:', song.title, songError);
            failCount++;
          }
        }
        
        if (failCount === 0) {
          console.log(`✅ 구글 시트에 곡 순서 저장 완료 (${successCount}곡)`);
          setCloudStatus('connected');
          setLastSync(new Date());
        } else {
          console.warn(`⚠️ 일부 곡 순서 저장 실패 (성공: ${successCount}, 실패: ${failCount})`);
          setCloudStatus('error');
        }
      } else {
        console.log('📱 오프라인 모드: 순서 정보를 로컬에만 저장');
      }

      // 로컬 상태 업데이트
      const updatedMusicList = musicList.map(song => {
        const orderedSong = songsWithOrder.find(s => s.id === song.id);
        return orderedSong ? { ...song, order: orderedSong.order } : song;
      });
      
      setMusicList(updatedMusicList);
      
      // 오프라인 백업 저장
      const backupData = {
        songs: updatedMusicList,
        folders: folderList,
        lastSync: new Date().toISOString(),
        version: '2.0'
      };
      localStorage.setItem('familyMusicApp_backup', JSON.stringify(backupData));
      
      // 원본 순서 업데이트
      setOriginalPlaylistOrder([...currentPlaylist]);
      setHasOrderChanges(false);
      
      alert(`✅ 곡 순서가 저장되었습니다! (${selectedFolder === 'all' ? '전체' : folderList.find(f => f.id === selectedFolder)?.name} 폴더)`);
      
    } catch (error) {
      console.error('🚨 곡 순서 저장 실패:', error);
      
      // 구체적인 오류 메시지 제공
      let errorMessage = '곡 순서 저장 중 오류가 발생했습니다.';
      if (error.message?.includes('지원되지 않는 액션')) {
        errorMessage = '구글 시트 연동 중 일시적 오류입니다. 오프라인에서 순서가 저장되었습니다.';
        
        // 오프라인 백업만 저장
        const songsWithOrder = currentPlaylist.map((song, index) => ({
          ...song,
          order: index + 1,
          lastOrderUpdate: new Date().toISOString()
        }));
        
        const updatedMusicList = musicList.map(song => {
          const orderedSong = songsWithOrder.find(s => s.id === song.id);
          return orderedSong ? { ...song, order: orderedSong.order } : song;
        });
        
        setMusicList(updatedMusicList);
        
        const backupData = {
          songs: updatedMusicList,
          folders: folderList,
          lastSync: new Date().toISOString(),
          version: '2.0'
        };
        localStorage.setItem('familyMusicApp_backup', JSON.stringify(backupData));
        
        setOriginalPlaylistOrder([...currentPlaylist]);
        setHasOrderChanges(false);
        
        alert('📱 오프라인에서 곡 순서가 저장되었습니다! 인터넷 연결 확인 후 다시 시도해보세요.');
        return;
      }
      
      alert(`❌ ${errorMessage}: ${error.message}`);
      setCloudStatus('error');
    } finally {
      setIsSavingOrder(false);
    }
  };

  // 순서 변경 취소 함수
  const cancelOrderChanges = () => {
    setCurrentPlaylist([...originalPlaylistOrder]);
    setHasOrderChanges(false);
    
    // 현재 재생 중인 곡의 인덱스 복원
    if (currentMusic) {
      const originalIndex = originalPlaylistOrder.findIndex(song => song.id === currentMusic.id);
      setCurrentIndex(originalIndex);
    }
    
    console.log('🔄 곡 순서 변경 취소됨');
  };

  const handleDragEnd = () => {
    setDraggedSong(null);
    setDragOverIndex(null);
  };

  useEffect(() => {
    initializeApp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 새로고침 방지 - 음악 재생 중일 때
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isPlaying || currentMusic) {
        e.preventDefault();
        e.returnValue = '음악이 재생 중입니다. 페이지를 나가시겠습니까?';
        return '음악이 재생 중입니다. 페이지를 나가시겠습니까?';
      }
    };

    const handleKeyDown = (e) => {
      // F5, Ctrl+R, Cmd+R 방지
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r')) {
        if (isPlaying || currentMusic) {
          e.preventDefault();
          alert('음악 재생 중에는 새로고침이 제한됩니다.');
          return false;
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, currentMusic]);

  // 키보드 이벤트 리스너를 별도의 useEffect로 분리
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Media Session API 설정 (블루투스/외부 장치 제어)
  useEffect(() => {
    if ('mediaSession' in navigator) {
      console.log('🎵 Media Session API 지원됨 - 외부 장치 제어 활성화');
      
      // 미디어 세션 액션 핸들러 설정
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('🎵 외부 장치에서 재생 요청');
        if (playerRef.current && !isPlaying) {
          playerRef.current.playVideo();
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('⏸️ 외부 장치에서 일시정지 요청');
        if (playerRef.current && isPlaying) {
          playerRef.current.pauseVideo();
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('⏮️ 외부 장치에서 이전곡 요청');
        prevSong();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        console.log('⏭️ 외부 장치에서 다음곡 요청');
        nextSong();
      });

      // 시크 바 제어 (지원 장치에서)
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (playerRef.current && details.seekTime) {
          console.log('⏩ 외부 장치에서 시크 요청:', details.seekTime);
          playerRef.current.seekTo(details.seekTime, true);
          setCurrentTime(details.seekTime);
        }
      });

      // 앞으로/뒤로 건너뛰기 (일부 장치에서 지원)
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (playerRef.current) {
          const seekTime = Math.min(currentTime + (details.seekOffset || 10), duration);
          console.log('⏩ 외부 장치에서 앞으로 건너뛰기:', seekTime);
          playerRef.current.seekTo(seekTime, true);
          setCurrentTime(seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (playerRef.current) {
          const seekTime = Math.max(currentTime - (details.seekOffset || 10), 0);
          console.log('⏪ 외부 장치에서 뒤로 건너뛰기:', seekTime);
          playerRef.current.seekTo(seekTime, true);
          setCurrentTime(seekTime);
        }
      });

      // 정지 버튼 (일부 장치에서 지원)
      navigator.mediaSession.setActionHandler('stop', () => {
        console.log('⏹️ 외부 장치에서 정지 요청');
        if (playerRef.current) {
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(0, true);
          setCurrentTime(0);
        }
      });

    } else {
      console.log('❌ Media Session API 미지원 - 외부 장치 제어 불가');
    }

    // 컴포넌트 언마운트 시 핸들러 정리
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('stop', null);
      }
    };
  }, [isPlaying, currentTime, duration]); // 의존성 추가

  // 현재 곡 정보 업데이트 시 Media Session 메타데이터 업데이트
  useEffect(() => {
    if ('mediaSession' in navigator && currentMusic) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentMusic.title || '알 수 없는 제목',
        artist: currentMusic.artist || '알 수 없는 아티스트',
        album: currentMusic.album || 'Music Hub',
        artwork: [
          { 
            src: currentMusic.artwork || 'https://placehold.co/512x512/1f2937/ffffff?text=🎵', 
            sizes: '512x512', 
            type: 'image/png' 
          },
          { 
            src: currentMusic.artwork || 'https://placehold.co/256x256/1f2937/ffffff?text=🎵', 
            sizes: '256x256', 
            type: 'image/png' 
          },
          { 
            src: currentMusic.artwork || 'https://placehold.co/96x96/1f2937/ffffff?text=🎵', 
            sizes: '96x96', 
            type: 'image/png' 
          }
        ]
      });

      console.log('🎵 Media Session 메타데이터 업데이트:', currentMusic.title);
    }
  }, [currentMusic]);

  // 재생 상태 변경 시 Media Session 상태 업데이트
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      console.log('🎵 Media Session 재생 상태:', isPlaying ? 'playing' : 'paused');
    }
  }, [isPlaying]);

  // 재생 위치 업데이트 (일부 장치에서 진행바 표시)
  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      if (duration > 0) {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: 1.0,
          position: currentTime
        });
      }
    }
  }, [currentTime, duration]);

  // 모바일에서 자동으로 미니 플레이어 모드로 시작
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768;
      setIsMiniPlayer(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const loadAllData = async () => {
    try {
      setCloudStatus('syncing');
      const online = await loadDataFromGoogleSheets();
      if (!online) {
        await loadOfflineBackup();
        setCloudStatus('disconnected');
      } else {
        setCloudStatus('connected');
        setLastSync(new Date());
        await saveOfflineBackup();
      }
      setLoading(false);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setCloudStatus('error');
      await loadOfflineBackup();
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setCloudStatus('syncing');
      const response = await callGoogleAPI('test');
      if (response.status === 'OK') {
        setCloudStatus('connected');
        return true;
      } else {
        throw new Error('연결 실패');
      }
    } catch {
      setCloudStatus('error');
      return false;
    }
  };

  const loadDataFromGoogleSheets = async () => {
  try {
    const connected = await testConnection();
    if (!connected) return false;
    
    // 🔥 폴더와 곡 데이터 모두 로드
    const [songsResponse, foldersResponse] = await Promise.all([
      callGoogleAPI('getSongs'),
      callGoogleAPI('getFolders')
    ]);
    
    if (songsResponse.error) throw new Error(songsResponse.error);
    if (foldersResponse.error) throw new Error(foldersResponse.error);
    
    const songs = songsResponse.songs || [];
    const serverFolders = foldersResponse.folders || [];
    
    // 🔥 기본 폴더와 서버 폴더 병합 (중복 제거)
    const defaultFolders = getDefaultFolders();
    const mergedFolders = [...defaultFolders];
    
    // 서버에서 온 폴더 중 기본 폴더가 아닌 것들만 추가
    serverFolders.forEach(serverFolder => {
      if (!defaultFolders.some(df => df.id === serverFolder.id)) {
        mergedFolders.push(serverFolder);
      }
    });
    
    console.log('✅ 구글 시트에서 데이터 로드 완료:', {
      songs: songs.length,
      folders: mergedFolders.length
    });
    
    setMusicList(songs);
    setFolderList(mergedFolders);
    updateCurrentPlaylist(songs, 'all', mergedFolders);
    return true;
  } catch (error) {
    console.error('구글 시트 로드 실패:', error);
    return false;
  }
};

  const saveOfflineBackup = async () => {
    try {
      const backupData = {
        songs: musicList,
        folders: folderList,
        lastSync: new Date().toISOString(),
        version: '2.0'
      };
      localStorage.setItem('familyMusicApp_backup', JSON.stringify(backupData));
    } catch (error) {
      console.error('오프라인 백업 저장 실패:', error);
    }
  };

  const loadOfflineBackup = async () => {
  try {
    const backupData = localStorage.getItem('familyMusicApp_backup');
    if (backupData) {
      const data = JSON.parse(backupData);
      
      // 🔥 백업된 폴더 정보가 있으면 사용, 없으면 기본 폴더 사용
      const backedUpFolders = data.folders || getDefaultFolders();
      const backedUpSongs = data.songs || [];
      
      console.log('📱 오프라인 백업에서 데이터 로드:', {
        songs: backedUpSongs.length,
        folders: backedUpFolders.length,
        lastSync: data.lastSync
      });
      
      setMusicList(backedUpSongs);
      setFolderList(backedUpFolders);
      updateCurrentPlaylist(backedUpSongs, 'all', backedUpFolders);
      return;
    }
    
    // 백업이 없으면 기본값 설정
    console.log('📱 백업 없음: 기본 설정 로드');
    setMusicList([]);
    setFolderList(getDefaultFolders());
    updateCurrentPlaylist([], 'all');
  } catch (error) {
    console.error('오프라인 백업 로드 실패:', error);
    setMusicList([]);
    setFolderList(getDefaultFolders());
    updateCurrentPlaylist([], 'all');
  }
};

  const getDefaultFolders = () => [
    { id: 'all', name: '전체', description: '모든 음악', color: '#6b7280', createdAt: new Date().toISOString(), createdBy: 'System', songCount: 0 },
    { id: 'general', name: '일반', description: '일반 음악', color: '#3b82f6', createdAt: new Date().toISOString(), createdBy: 'System', songCount: 0 }
  ];

  const updateCurrentPlaylist = (songs, folderId, folders = folderList) => {
    let playlist = folderId === 'all' ? songs : songs.filter(song => song.folder === folderId);
    setCurrentPlaylist(playlist);
    
    // 원본 순서 저장 (순서 변경 감지용)
    setOriginalPlaylistOrder([...playlist]);
    setHasOrderChanges(false);
    
    const updatedFolders = folders.map(folder => ({
      ...folder,
      songCount: folder.id === 'all' 
        ? songs.length  // 전체 폴더는 모든 곡의 총 개수
        : songs.filter(song => song.folder === folder.id).length  // 다른 폴더는 해당 폴더의 곡 개수
    }));
    setFolderList(updatedFolders);
  };

  const checkAdminPassword = async (password, showError = true) => {
    try {
      if (cloudStatus === 'connected') {
        const response = await callGoogleAPI('checkPassword', { password });
        return response.valid === true;
      } else {
        return password === 'family2024';
      }
    } catch {
      if (showError) setAdminPasswordError('비밀번호 확인 중 오류가 발생했습니다.');
      return false;
    }
  };

  const enterAdminMode = async () => {
    setAdminPasswordError('');
    const isValid = await checkAdminPassword(adminPassword);
    if (isValid) {
      setIsAdminMode(true);
      setShowPasswordDialog(false);
      sessionStorage.setItem(ADMIN_PASSWORD_KEY, adminPassword);
    } else {
      setAdminPasswordError('비밀번호가 올바르지 않습니다.');
    }
  };

  const exitAdminMode = () => {
    setIsAdminMode(false);
    setAdminPassword('');
    sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
    setShowFolderManager(false);
    setShowMoveDialog(false);
    setShowSongEditDialog(false);
    setSelectedSongs(new Set());
  };

  const callGoogleAPI = async (action, data = {}) => {
  try {
    if (GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_URL_HERE')) {
      throw new Error('구글 앱스크립트 URL이 설정되지 않았습니다.');
    }
    
    const params = { action, password: adminPassword || '', ...data };
    console.log('🌐 구글 API 호출:', action, params); // 🔥 디버깅 로그 추가
    
    const result = await makeJSONPRequest(GOOGLE_SCRIPT_URL, params);
    console.log('🌐 구글 API 응답:', action, result); // 🔥 디버깅 로그 추가
    
    return result;
  } catch (error) {
    console.error('🚨 구글 API 호출 실패:', action, error);
    setCloudStatus('error');
    throw error;
  }
};

  const makeJSONPRequest = (url, params = {}) => {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const urlParams = new URLSearchParams({ ...params, callback: callbackName, timestamp: Date.now() });
      
      window[callbackName] = (data) => {
        document.head.removeChild(script);
        delete window[callbackName];
        resolve(data);
      };
      
      const script = document.createElement('script');
      script.src = `${url}?${urlParams.toString()}`;
      script.onerror = () => {
        document.head.removeChild(script);
        delete window[callbackName];
        reject(new Error('JSONP 요청 실패'));
      };
      
      document.head.appendChild(script);
    });
  };

  const extractYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // YouTube 메타데이터 자동 추출 함수 (oEmbed API 사용 - API 키 불필요)
  const fetchYouTubeMetadata = async () => {
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      alert('먼저 유효한 YouTube URL을 입력해주세요.');
      return;
    }

    try {
      setCustomTitle('로딩 중...');
      setCustomArtist('로딩 중...');

      // YouTube oEmbed API 사용 (API 키 불필요)
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      
      const response = await fetch(oembedUrl);

      if (!response.ok) {
        throw new Error(`oEmbed API 호출 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.title && data.author_name) {
        const title = data.title;
        const channelName = data.author_name;
        
        // 제목에서 일반적인 패턴 파싱 시도
        const titleParts = title.split(' - ');
        if (titleParts.length >= 2) {
          // "아티스트 - 곡제목" 형태인 경우
          setCustomArtist(titleParts[0].trim());
          setCustomTitle(titleParts.slice(1).join(' - ').trim());
        } else {
          // 그렇지 않으면 전체 제목과 채널명 사용
          setCustomTitle(title.trim());
          setCustomArtist(channelName.trim());
        }
        
        // 성공시 조용히 완료 (알림창 없음)
        console.log('✅ 메타데이터 자동 입력 완료:', { title, channelName });
      } else {
        throw new Error('비디오 정보를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('YouTube 메타데이터 가져오기 실패:', error);
      
      // oEmbed 실패시 수동 파싱 시도
      try {
        await fetchYouTubeMetadataFallback(videoId);
      } catch (fallbackError) {
        setCustomTitle('');
        setCustomArtist('');
        alert(`메타데이터 가져오기 실패: ${error.message}\n수동으로 입력해주세요.`);
      }
    }
  };

  // 대체 방법: 간단한 메타데이터 추출 (YouTube 페이지 제목 활용)
  const fetchYouTubeMetadataFallback = async (videoId) => {
    // 기본값 설정
    setCustomTitle(`YouTube 비디오 (ID: ${videoId})`);
    setCustomArtist('YouTube');
    console.log('⚠️ 기본 정보로 설정되었습니다. 수동으로 수정해주세요.');
  };

  const addYouTubeMusic = async () => {
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      alert('유효한 YouTube URL을 입력해주세요.');
      return;
    }
    if (!customTitle.trim()) {
      alert('곡 제목을 입력해주세요.');
      return;
    }

    try {
      const addedSong = {
        id: `offline_${Date.now()}`,
        title: customTitle.trim(),
        artist: customArtist.trim() || '알 수 없는 아티스트',
        youtubeId: videoId,
        folder: selectedFolderForNew,
        duration: 0,
        album: '사용자 추가',
        year: new Date().getFullYear(),
        addedAt: new Date().toISOString(),
        addedBy: 'User',
        artwork: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      };
      
      // 먼저 로컬에 추가 (즉시 UI 업데이트)
      const updatedList = [...musicList, addedSong];
      setMusicList(updatedList);
      updateCurrentPlaylist(updatedList, selectedFolder);
      
      // 로컬 백업 저장
      await saveOfflineBackup();

      // 🌐 구글시트에도 곡 추가 시도
      try {
        if (!GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_URL_HERE')) {
          setCloudStatus('syncing');
          
          // 구글시트 전용 데이터 구조로 변환
          const songForSheet = {
            id: addedSong.id,
            title: addedSong.title,
            artist: addedSong.artist,
            youtubeId: addedSong.youtubeId,
            youtubeUrl: youtubeUrl.trim(), // YouTube URL 전체 추가
            folder: addedSong.folder,
            duration: addedSong.duration,
            album: addedSong.album,
            year: addedSong.year,
            addedAt: addedSong.addedAt,
            addedBy: addedSong.addedBy
          };
          
          console.log('🔄 구글시트로 전송할 데이터:', songForSheet);
          
          await callGoogleAPI('addSong', songForSheet);
          setCloudStatus('connected');
          setLastSync(new Date());
          console.log('✅ 구글시트에 곡 추가 완료:', addedSong.title);
        } else {
          console.log('⚠️ 구글시트 URL이 설정되지 않음. 로컬에만 저장됨.');
        }
      } catch (cloudError) {
        console.error('🚨 구글시트 저장 실패 (로컬은 저장됨):', cloudError);
        setCloudStatus('error');
        // 구글시트 저장 실패해도 로컬은 이미 저장되었으므로 계속 진행
      }

      setYoutubeUrl('');
      setCustomTitle('');
      setCustomArtist('');
      
      // 성공시 조용히 완료 (알림창 없음)
      console.log('✅ 곡 추가 완료:', addedSong.title);
    } catch (error) {
      alert(`곡 추가 중 오류: ${error.message}`);
    }
  };

  const deleteSong = async (songId) => {
    const song = musicList.find(s => s.id === songId);
    if (!song || !confirm(`"${song.title}"을(를) 삭제하시겠습니까?`)) return;

    try {
      // 먼저 로컬에서 삭제 (즉시 UI 업데이트)
      const updatedList = musicList.filter(s => s.id !== songId);
      setMusicList(updatedList);
      updateCurrentPlaylist(updatedList, selectedFolder);
      await saveOfflineBackup();
      
      // 현재 재생 중인 곡이면 정지
      if (currentMusic?.id === songId) {
        setCurrentMusic(null);
        setIsPlaying(false);
        if (playerRef.current) playerRef.current.pauseVideo();
      }
      
      // 🌐 구글시트에서도 곡 삭제 시도
      try {
        if (!GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_URL_HERE')) {
          setCloudStatus('syncing');
          
          console.log('🗑️ 구글시트에서 곡 삭제 요청:', { songId: songId, songTitle: song.title });
          
          await callGoogleAPI('deleteSong', {
            songId: songId,
            songTitle: song.title // 디버깅용
          });
          setCloudStatus('connected');
          setLastSync(new Date());
          console.log('✅ 구글시트에서 곡 삭제 완료:', song.title);
        }
      } catch (cloudError) {
        console.error('🚨 구글시트 삭제 실패 (로컬은 삭제됨):', cloudError);
        setCloudStatus('error');
      }
      
      // 성공시 조용히 완료 (알림창 없음)
      console.log('✅ 곡 삭제 완료:', song.title);
    } catch (error) {
      alert(`삭제 중 오류: ${error.message}`);
    }
  };

  const filterByFolder = (folderId) => {
    setSelectedFolder(folderId);
    setSearchTerm('');
    updateCurrentPlaylist(musicList, folderId);
    
    // 폴더 변경 시 순서 변경 상태 리셋
    setHasOrderChanges(false);
    setIsSavingOrder(false);
  };

  const createNewFolder = async () => {
  if (!newFolderName.trim()) {
    alert('폴더 이름을 입력해주세요.');
    return;
  }
  
  if (folderList.some(folder => folder.name === newFolderName.trim())) {
    alert('이미 존재하는 폴더 이름입니다.');
    return;
  }

  try {
    // 자동 색상 배정 (기존 폴더들이 사용하지 않는 색상 선택)
    const usedColors = folderList.map(f => f.color);
    const availableColors = FOLDER_COLORS.filter(color => !usedColors.includes(color));
    const autoColor = availableColors.length > 0 ? availableColors[0] : FOLDER_COLORS[folderList.length % FOLDER_COLORS.length];
    
    const newFolder = {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      description: newFolderDescription.trim() || '사용자 생성 폴더',
      color: newFolderColor || autoColor, // 사용자가 지정한 색상이 있으면 사용, 없으면 자동 배정
      createdAt: new Date().toISOString(),
      createdBy: 'Admin',
      songCount: 0
    };

    // 🔥 구글 시트에 저장 - 연결 상태 확인 개선
    try {
      if (cloudStatus === 'connected' || cloudStatus === 'syncing') {
        setCloudStatus('syncing');
        const response = await callGoogleAPI('createFolder', newFolder);
        if (response.error) {
          throw new Error(response.error);
        }
        console.log('✅ 폴더가 구글 시트에 저장되었습니다:', newFolder.name);
        setCloudStatus('connected');
      } else {
        // 연결 재시도
        const connected = await testConnection();
        if (connected) {
          const response = await callGoogleAPI('createFolder', newFolder);
          if (response.error) throw new Error(response.error);
          console.log('✅ 폴더가 구글 시트에 저장되었습니다:', newFolder.name);
        } else {
          console.log('📱 오프라인 모드: 폴더를 로컬에 저장합니다:', newFolder.name);
        }
      }
    } catch (cloudError) {
      console.error('구글 시트 저장 실패:', cloudError);
      setCloudStatus('error');
    }

    // 로컬 상태 업데이트
    const updatedFolders = [...folderList, newFolder];
    setFolderList(updatedFolders);
    
    // 🔥 오프라인 백업 저장 - 폴더 정보 포함
    const backupData = {
      songs: musicList,
      folders: updatedFolders,
      lastSync: new Date().toISOString(),
      version: '2.0'
    };
    localStorage.setItem('familyMusicApp_backup', JSON.stringify(backupData));

    setNewFolderName('');
    setNewFolderDescription('');
    
    // 다음 폴더를 위한 자동 색상 설정 (기존 usedColors 변수 재사용)
    const nextAvailableColors = FOLDER_COLORS.filter(color => !usedColors.includes(color));
    const nextAutoColor = nextAvailableColors.length > 1 ? nextAvailableColors[1] : FOLDER_COLORS[(folderList.length + 1) % FOLDER_COLORS.length];
    setNewFolderColor(nextAutoColor);
    alert(`"${newFolder.name}" 폴더가 생성되었습니다!`);
  } catch (error) {
    console.error('폴더 생성 오류:', error);
    alert(`폴더 생성 중 오류: ${error.message}`);
  }
};

  const deleteFolderById = async (folderId) => {
    const folder = folderList.find(f => f.id === folderId);
    if (!folder) return;
    
    if (['all', 'general'].includes(folderId)) {
      alert('기본 폴더는 삭제할 수 없습니다.');
      return;
    }
    
    const songsInFolder = musicList.filter(song => song.folder === folderId);
    if (songsInFolder.length > 0) {
      const moveToGeneral = confirm(
        `"${folder.name}" 폴더에 ${songsInFolder.length}곡이 있습니다.\n` +
        `폴더를 삭제하면 곡들이 "일반" 폴더로 이동됩니다.\n` +
        `계속하시겠습니까?`
      );
      if (!moveToGeneral) return;
    }

    try {
      const updatedFolders = folderList.filter(f => f.id !== folderId);
      const updatedSongs = musicList.map(song => 
        song.folder === folderId ? { ...song, folder: 'general' } : song
      );
      
      setFolderList(updatedFolders);
      setMusicList(updatedSongs);
      
      if (selectedFolder === folderId) {
        setSelectedFolder('all');
        updateCurrentPlaylist(updatedSongs, 'all');
      } else {
        updateCurrentPlaylist(updatedSongs, selectedFolder);
      }
      
      await saveOfflineBackup();
      alert(`"${folder.name}" 폴더가 삭제되었습니다.`);
    } catch (error) {
      alert(`폴더 삭제 중 오류: ${error.message}`);
    }
  };

  const editFolderById = async (folderId, newName, newDescription, newColor) => {
    const folder = folderList.find(f => f.id === folderId);
    if (!folder) return;
    
    if (['all', 'general'].includes(folderId)) {
      alert('기본 폴더는 이름을 변경할 수 없습니다.');
      return;
    }

    if (!newName.trim()) {
      alert('폴더 이름을 입력해주세요.');
      return;
    }
    
    if (folderList.some(f => f.name === newName.trim() && f.id !== folderId)) {
      alert('이미 존재하는 폴더 이름입니다.');
      return;
    }

    try {
      const updatedFolder = {
        ...folder,
        name: newName.trim(),
        description: newDescription.trim() || folder.description,
        color: newColor || folder.color,
        updatedAt: new Date().toISOString()
      };

      const updatedFolders = folderList.map(f => 
        f.id === folderId ? updatedFolder : f
      );
      setFolderList(updatedFolders);
      await saveOfflineBackup();
      alert(`"${updatedFolder.name}" 폴더가 수정되었습니다!`);
    } catch (error) {
      alert(`폴더 수정 중 오류: ${error.message}`);
    }
  };

  // 곡 이동 관련 함수들
  const toggleSongSelection = (songId) => {
    const newSelected = new Set(selectedSongs);
    if (newSelected.has(songId)) {
      newSelected.delete(songId);
    } else {
      newSelected.add(songId);
    }
    setSelectedSongs(newSelected);
  };

  const selectAllSongs = () => {
    const allSongIds = new Set(filteredMusic.map(song => song.id));
    setSelectedSongs(allSongIds);
  };

  const clearSongSelection = () => {
    setSelectedSongs(new Set());
  };

  // 선택 재생 관련 함수들
  const toggleSongForPlay = (songId) => {
    const newSelected = new Set(selectedSongsForPlay);
    if (newSelected.has(songId)) {
      newSelected.delete(songId);
    } else {
      newSelected.add(songId);
    }
    setSelectedSongsForPlay(newSelected);
  };

  const selectAllSongsForPlay = () => {
    const allSongIds = new Set(filteredMusic.map(song => song.id));
    setSelectedSongsForPlay(allSongIds);
  };

  const clearSongSelectionForPlay = () => {
    setSelectedSongsForPlay(new Set());
  };

  const playSelectedSongs = () => {
    if (selectedSongsForPlay.size === 0) {
      alert('재생할 곡을 선택해주세요.');
      return;
    }
    
    // 선택된 곡들로만 플레이리스트 구성
    const selectedSongsList = filteredMusic.filter(song => selectedSongsForPlay.has(song.id));
    setCurrentPlaylist(selectedSongsList);
    setIsSelectivePlayMode(true);
    
    // 첫 번째 선택된 곡부터 재생
    if (selectedSongsList.length > 0) {
      loadSong(selectedSongsList[0], 0);
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.playVideo();
          try {
            playerRef.current.setPlaybackQuality('small');
          } catch (e) {
            // 에러 무시
          }
        }
      }, 2000);
      setIsPlaying(true);
    }
    
    console.log('✅ 선택된 곡 재생 시작:', selectedSongsList.length, '곡');
  };

  const playAllSongs = () => {
    // 전체 곡으로 플레이리스트 복원
    setCurrentPlaylist(filteredMusic);
    setIsSelectivePlayMode(false);
    
    // 현재 재생 중인 곡이 있으면 그대로 유지, 없으면 첫 번째 곡
    if (currentMusic && filteredMusic.find(song => song.id === currentMusic.id)) {
      const currentIndex = filteredMusic.findIndex(song => song.id === currentMusic.id);
      setCurrentIndex(currentIndex);
    } else if (filteredMusic.length > 0) {
      loadSong(filteredMusic[0], 0);
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.playVideo();
          try {
            playerRef.current.setPlaybackQuality('small');
          } catch (e) {
            // 에러 무시
          }
        }
      }, 2000);
      setIsPlaying(true);
    }
    
    console.log('✅ 전체 곡 재생 모드:', filteredMusic.length, '곡');
  };

  const moveSongsToFolder = async (songIds, folderId) => {
  if (songIds.length === 0) return;
  
  const targetFolderName = folderList.find(f => f.id === folderId)?.name || '알 수 없는 폴더';
  
  try {
    const updatedSongs = musicList.map(song => 
      songIds.includes(song.id) ? { ...song, folder: folderId } : song
    );
    
    // 🔥 구글 시트에 곡 정보 업데이트 - 수정된 방식
    try {
      if (cloudStatus === 'connected' || cloudStatus === 'syncing') {
        setCloudStatus('syncing');
        
        console.log(`구글 시트에 ${songIds.length}곡 이동 요청:`, songIds, 'to', folderId);
        
        // 방법 1: moveSongsToFolder API 호출 (여러 곡 한번에)
        const response = await callGoogleAPI('moveSongsToFolder', { 
          songIds: JSON.stringify(songIds),
          folderId: folderId
        });
        
        if (response.error) {
          console.error('곡 이동 API 실패:', response.error);
          throw new Error(response.error);
        }
        
        console.log('✅ 구글 시트 곡 이동 성공:', response);
        setCloudStatus('connected');
      } else {
        // 연결 재시도
        console.log('연결 상태 확인 중...');
        const connected = await testConnection();
        if (connected) {
          const response = await callGoogleAPI('moveSongsToFolder', { 
            songIds: JSON.stringify(songIds),
            folderId: folderId
          });
          if (!response.error) {
            console.log('✅ 재연결 후 곡 이동 성공');
          }
        } else {
          console.log('📱 오프라인 모드: 곡 이동을 로컬에만 저장합니다.');
        }
      }
    } catch (cloudError) {
      console.error('구글 시트 업데이트 실패:', cloudError);
      setCloudStatus('error');
      
      // 구글 시트 실패 시 사용자에게 알림
      alert(`곡 이동은 완료되었지만 구글 시트 동기화에 실패했습니다: ${cloudError.message}`);
    }
    
    // 로컬 상태 업데이트
    setMusicList(updatedSongs);
    updateCurrentPlaylist(updatedSongs, selectedFolder);
    
    // 오프라인 백업 저장
    const backupData = {
      songs: updatedSongs,
      folders: folderList,
      lastSync: new Date().toISOString(),
      version: '2.0'
    };
    localStorage.setItem('familyMusicApp_backup', JSON.stringify(backupData));
    
    const movedCount = songIds.length;
    alert(`${movedCount}곡이 "${targetFolderName}" 폴더로 이동되었습니다.`);
    
    setSelectedSongs(new Set());
    setShowMoveDialog(false);
  } catch (error) {
    console.error('곡 이동 중 오류:', error);
    alert(`곡 이동 중 오류: ${error.message}`);
  }
};

  const moveSingleSongToFolder = async (songId, folderId) => {
  try {
    console.log(`단일 곡 이동: ${songId} → ${folderId}`);
    
    // 🔥 구글 시트에 단일 곡 이동 요청
    if (cloudStatus === 'connected' || cloudStatus === 'syncing') {
      setCloudStatus('syncing');
      
      const response = await callGoogleAPI('moveSongToFolder', { 
        songId: songId,
        folderId: folderId
      });
      
      if (response.error) {
        console.error('단일 곡 이동 실패:', response.error);
        alert(`곡 이동 실패: ${response.error}`);
        return;
      }
      
      console.log('✅ 구글 시트에 단일 곡 이동 성공');
      setCloudStatus('connected');
    } else {
      // 연결 재시도
      const connected = await testConnection();
      if (connected) {
        const response = await callGoogleAPI('moveSongToFolder', { 
          songId: songId,
          folderId: folderId
        });
        if (response.error) {
          alert(`곡 이동 실패: ${response.error}`);
          return;
        }
      } else {
        console.log('📱 오프라인 모드: 단일 곡 이동을 로컬에만 저장');
      }
    }
    
    // 로컬 상태 업데이트
    const updatedSongs = musicList.map(song => 
      song.id === songId ? { ...song, folder: folderId } : song
    );
    
    setMusicList(updatedSongs);
    updateCurrentPlaylist(updatedSongs, selectedFolder);
    
    // 오프라인 백업 저장
    const backupData = {
      songs: updatedSongs,
      folders: folderList,
      lastSync: new Date().toISOString(),
      version: '2.0'
    };
    localStorage.setItem('familyMusicApp_backup', JSON.stringify(backupData));
    
    const targetFolderName = folderList.find(f => f.id === folderId)?.name;
    console.log(`곡이 "${targetFolderName}" 폴더로 이동되었습니다.`);
    
  } catch (error) {
    console.error('단일 곡 이동 오류:', error);
    alert(`곡 이동 중 오류: ${error.message}`);
  }
};

  const editSong = (song) => {
    setEditingSong(song);
    setShowSongEditDialog(true);
  };

  const updateSong = async (songId, updates) => {
    try {
      // 먼저 로컬에서 수정 (즉시 UI 업데이트)
      const updatedSongs = musicList.map(song => 
        song.id === songId ? { ...song, ...updates } : song
      );
      
      setMusicList(updatedSongs);
      updateCurrentPlaylist(updatedSongs, selectedFolder);
      await saveOfflineBackup();
      
      // 🌐 구글시트에서도 곡 정보 수정 시도
      try {
        if (!GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_URL_HERE')) {
          setCloudStatus('syncing');
          
          console.log('✏️ 구글시트에서 곡 수정 요청:', { songId: songId, updates: updates });
          
          await callGoogleAPI('updateSong', {
            songId: songId,
            title: updates.title,
            artist: updates.artist,
            album: updates.album,
            year: updates.year,
            folder: updates.folder,
            updatedAt: new Date().toISOString()
          });
          setCloudStatus('connected');
          setLastSync(new Date());
          console.log('✅ 구글시트에서 곡 수정 완료:', songId);
        }
      } catch (cloudError) {
        console.error('🚨 구글시트 수정 실패 (로컬은 수정됨):', cloudError);
        setCloudStatus('error');
      }
      
      setShowSongEditDialog(false);
      setEditingSong(null);
      
      // 성공시 조용히 완료 (알림창 없음)
      console.log('✅ 곡 수정 완료:', songId);
    } catch (error) {
      alert(`곡 수정 중 오류: ${error.message}`);
    }
  };

  const youtubeOpts = {
    height: '0',
    width: '0',
    playerVars: { 
      autoplay: 0, 
      controls: 0, 
      disablekb: 1, 
      enablejsapi: 1, 
      fs: 0, 
      modestbranding: 1, 
      rel: 0, 
      showinfo: 0,
      iv_load_policy: 3,  // 동영상 주석 숨김
      cc_load_policy: 0,  // 자막 비활성화
      playsinline: 1,      // 인라인 재생
      origin: window.location.origin,  // 원본 도메인 설정
      // 광고 최소화 설정
      loop: 0,            // 반복 재생 비활성화
      start: 1,           // 1초부터 시작 (일부 광고 스킵 가능)
      quality: 'small',   // 낮은 화질로 설정 (광고 빈도 감소)
      cc_lang_pref: 'ko', // 한국어 자막 설정
      hl: 'ko',           // 인터페이스 언어 한국어
      // 추가 최적화 설정
      widget_referrer: window.location.origin,
      enablejsapi: 1,
      wmode: 'transparent'
    }
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    if (currentMusic?.youtubeId) {
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.loadVideoById(currentMusic.youtubeId);
          playerRef.current.setVolume(volume);
          
          // 광고 스킵을 위한 추가 설정
          try {
            // 플레이어 품질을 낮게 설정 (광고 빈도 감소)
            playerRef.current.setPlaybackQuality('small');
          } catch (error) {
            console.log('플레이어 품질 설정 실패:', error);
          }
        }
      }, 500);
    }
  };

  const onPlayerStateChange = (event) => {
    const { data } = event;
    
    // 광고 감지 및 스킵 시도
    try {
      if (playerRef.current) {
        const playerState = playerRef.current.getPlayerState();
        const videoUrl = playerRef.current.getVideoUrl();
        
        // 광고가 재생 중인지 확인 (완벽하지 않지만 시도)
        if (videoUrl && videoUrl.includes('googleads')) {
          console.log('광고 감지됨, 스킵 시도');
          // 광고 스킵 시도 (YouTube 정책상 제한적)
          setTimeout(() => {
            if (playerRef.current && playerRef.current.getPlayerState() === 1) {
              try {
                playerRef.current.seekTo(1, true); // 1초로 이동
              } catch (e) {
                console.log('광고 스킵 실패:', e);
              }
            }
          }, 1000);
        }
      }
    } catch (error) {
      // 에러 무시 (광고 스킵은 보조 기능)
    }
    
    // 기존 상태 변경 처리
    if (data === 1) { setIsPlaying(true); startProgressTracking(); }
    else if (data === 2) { setIsPlaying(false); stopProgressTracking(); }
    else if (data === 0) { setIsPlaying(false); stopProgressTracking(); handleSongEnd(); }
  };

  const startProgressTracking = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.getCurrentTime());
        setDuration(playerRef.current.getDuration());
      }
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const loadSong = (song, index) => {
    if (!song) return;
    setCurrentMusic(song);
    setCurrentIndex(index);
    if (playerRef.current) {
      try {
        // 광고 최소화를 위한 추가 파라미터와 함께 로드
        playerRef.current.loadVideoById({
          videoId: song.youtubeId,
          startSeconds: 1, // 1초부터 시작 (일부 광고 스킵 가능)
          suggestedQuality: 'small' // 낮은 화질로 설정
        });
        playerRef.current.setVolume(volume);
        
        // 플레이어 품질을 추가로 설정
        setTimeout(() => {
          try {
            if (playerRef.current) {
              playerRef.current.setPlaybackQuality('small');
            }
          } catch (e) {
            // 에러 무시
          }
        }, 1000);
      } catch {
        setTimeout(() => loadSong(song, index), 1000);
      }
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      if (playerRef.current) playerRef.current.pauseVideo();
    } else {
      if (currentMusic) {
        if (playerRef.current) {
          playerRef.current.playVideo();
          // 광고 최소화를 위한 추가 설정
          setTimeout(() => {
            try {
              if (playerRef.current) {
                playerRef.current.setPlaybackQuality('small');
              }
            } catch (e) {
              // 에러 무시
            }
          }, 1000);
        }
      } else if (currentPlaylist.length > 0) {
        loadSong(currentPlaylist[0], 0);
        setTimeout(() => {
          if (playerRef.current) {
            playerRef.current.playVideo();
            try {
              playerRef.current.setPlaybackQuality('small');
            } catch (e) {
              // 에러 무시
            }
          }
        }, 2000);
      }
    }
  };

  const nextSong = () => {
    if (currentPlaylist.length === 0) return;
    let nextIndex = isShuffle ? Math.floor(Math.random() * currentPlaylist.length) : (currentIndex + 1) % currentPlaylist.length;
    if (currentPlaylist[nextIndex]) {
      loadSong(currentPlaylist[nextIndex], nextIndex);
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.playVideo();
          // 광고 최소화를 위한 추가 설정
          try {
            playerRef.current.setPlaybackQuality('small');
          } catch (e) {
            // 에러 무시
          }
        }
      }, 2000);
    }
  };

  const prevSong = () => {
    if (currentPlaylist.length === 0) return;
    const prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    if (currentPlaylist[prevIndex]) {
      loadSong(currentPlaylist[prevIndex], prevIndex);
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.playVideo();
          // 광고 최소화를 위한 추가 설정
          try {
            playerRef.current.setPlaybackQuality('small');
          } catch (e) {
            // 에러 무시
          }
        }
      }, 2000);
    }
  };

  const handleSongEnd = () => {
    if (repeatMode === 'one') {
      setTimeout(() => playerRef.current?.playVideo(), 1000);
    } else if (repeatMode === 'all' || currentIndex < currentPlaylist.length - 1) {
      nextSong();
    }
  };

  const handleSongSelect = (song, _index) => {
    const currentFilteredList = filteredMusic.length > 0 ? filteredMusic : currentPlaylist;
    setCurrentPlaylist(currentFilteredList);
    const songIndex = currentFilteredList.findIndex(s => s.id === song.id);
    if (songIndex >= 0) {
      loadSong(song, songIndex);
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.playVideo();
          // 광고 최소화를 위한 추가 설정
          try {
            playerRef.current.setPlaybackQuality('small');
          } catch (e) {
            // 에러 무시
          }
        }
      }, 2000);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 진행바 CSS 변수 업데이트
  const updateProgressBar = () => {
    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
      progressBar.style.setProperty('--progress', `${progressPercentage}%`);
    }
  };

  // currentTime이 변경될 때마다 진행바 업데이트
  useEffect(() => {
    updateProgressBar();
  }, [currentTime, duration]);

  const filteredMusic = currentPlaylist.filter(song => 
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 모바일 감지
  const isMobile = () => {
    return window.innerWidth <= 768;
  };

  // Bottom Sheet 핸들러들
  const openBottomSheet = () => {
    if (isMobile()) {
      setIsBottomSheetOpen(true);
      document.body.style.overflow = 'hidden';
    }
  };

  const closeBottomSheet = () => {
    setIsBottomSheetOpen(false);
    document.body.style.overflow = 'auto';
  };

  // Bottom Sheet 드래그 핸들러
  const handleBottomSheetDrag = (e) => {
    const touch = e.touches[0];
    const sheet = bottomSheetRef.current;
    if (!sheet) return;

    const startY = touch.clientY;
    const sheetHeight = sheet.offsetHeight;
    
    const handleMove = (moveEvent) => {
      const currentY = moveEvent.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 0) {
        sheet.style.transform = `translateY(${diff}px)`;
      }
    };
    
    const handleEnd = (endEvent) => {
      const endY = endEvent.changedTouches[0].clientY;
      const diff = endY - startY;
      
      if (diff > sheetHeight * 0.3) {
        closeBottomSheet();
      } else {
        sheet.style.transform = 'translateY(0)';
      }
      
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
    
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  };

  const CloudStatusIcon = () => {
    switch(cloudStatus) {
      case 'connected': return <Cloud size={16} style={{ color: '#10b981' }} title="구글 시트 연결됨" />;
      case 'syncing': return <Cloud size={16} style={{ color: '#f59e0b', animation: 'pulse 2s infinite' }} title="동기화 중..." />;
      case 'error': return <Warning size={16} style={{ color: '#ef4444' }} title="동기화 오류" />;
      default: return <CloudSlash size={16} style={{ color: '#6b7280' }} title="오프라인 모드" />;
    }
  };

  // Skeleton UI 컴포넌트
  const SkeletonCard = () => (
    <div className="skeleton-card">
      <div className="skeleton-artwork"></div>
      <div className="skeleton-text">
        <div className="skeleton-title"></div>
        <div className="skeleton-artist"></div>
      </div>
    </div>
  );

  const SkeletonUI = () => (
    <div className="skeleton-container">
      {[...Array(8)].map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );

  return (
    <div className="container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {/* 왼쪽 상단 - 기능 상태 표시 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem' }}>
            <span style={{ color: '#93c5fd' }} title="광고 최소화 모드 활성화">💡 광고최소화</span>
            {'mediaSession' in navigator && <span style={{ color: '#10b981' }} title="블루투스/외부 장치 제어 지원">🎮 외부제어</span>}
          </div>

          {/* 중앙 - 앱 제목 */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 className="app-title">🎵 Music Hub</h1>
            {cloudStatus !== 'connected' && (
              <p className="welcome-message" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <CloudStatusIcon />
                <span style={{ fontSize: '0.75rem' }}>
                  {cloudStatus === 'syncing' && '동기화'}
                  {cloudStatus === 'disconnected' && '오프라인'}
                  {cloudStatus === 'error' && '오류'}
                </span>
              </p>
            )}
          </div>

          {/* 오른쪽 - 관리자 모드 버튼 */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button onClick={testConnection} disabled={cloudStatus === 'syncing'} 
              style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: cloudStatus === 'connected' ? '#10b981' : '#f59e0b', color: 'white', cursor: 'pointer' }}
              title="구글 시트 연결 테스트">
              <Cloud size={14} />
            </button>
            {!isAdminMode ? (
              <button onClick={() => setShowPasswordDialog(true)} 
                style={{ padding: '0.375rem 0.5rem', borderRadius: '0.375rem', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                title="관리자 모드">
                <UserGear size={12} /> 관리자
              </button>
            ) : (
              <button onClick={exitAdminMode} 
                style={{ padding: '0.375rem 0.5rem', borderRadius: '0.375rem', border: 'none', background: '#6b7280', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                title="일반 모드">
                <User size={12} /> 일반
              </button>
            )}
          </div>
        </div>
      </header>

      {showPasswordDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1f2937', borderRadius: '1rem', padding: '2rem', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ marginBottom: '1rem' }}>관리자 모드 진입</h3>
            <input type="password" placeholder="관리자 비밀번호 입력" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && enterAdminMode()}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #6b7280', background: '#374151', color: 'white', fontSize: '1rem', marginBottom: '0.5rem' }} autoFocus />
            {adminPasswordError && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{adminPasswordError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowPasswordDialog(false); setAdminPassword(''); setAdminPasswordError(''); }} 
                style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#6b7280', color: 'white', cursor: 'pointer' }}>취소</button>
              <button onClick={enterAdminMode} style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer' }}>확인</button>
            </div>
          </div>
        </div>
      )}

      {showFolderManager && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1f2937', borderRadius: '1rem', padding: '2rem', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderPlus size={24} /> 폴더 관리
            </h3>
            
            <div style={{ marginBottom: '2rem', padding: '1rem', background: '#374151', borderRadius: '0.5rem' }}>
              <h4 style={{ marginBottom: '1rem', color: '#10b981' }}>➕ 새 폴더 생성</h4>
              <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="폴더 이름 *"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #6b7280', background: '#1f2937', color: 'white' }}
                />
                <input
                  type="text"
                  placeholder="폴더 설명 (선택사항)"
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #6b7280', background: '#1f2937', color: 'white' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label style={{ color: '#f3f4f6', fontSize: '0.875rem' }}>폴더 색상:</label>
                  <input
                    type="color"
                    value={newFolderColor}
                    onChange={(e) => setNewFolderColor(e.target.value)}
                    style={{ width: '40px', height: '30px', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}
                  />
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: newFolderColor }}></div>
                </div>
              </div>
              <button onClick={createNewFolder} 
                style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer' }}>
                <FolderPlus size={16} style={{ marginRight: '0.25rem' }} />
                폴더 생성
              </button>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '1rem', color: '#f59e0b' }}>📂 기존 폴더 관리</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflow: 'auto' }}>
                {folderList.filter(f => f.id !== 'all').map(folder => (
                  <div key={folder.id} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '0.75rem', background: '#374151', borderRadius: '0.5rem',
                    border: `2px solid ${folder.color}` 
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: folder.color }}></div>
                        <strong style={{ color: '#f3f4f6' }}>{folder.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>({folder.songCount || 0}곡)</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#d1d5db', margin: 0 }}>{folder.description}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {!['general'].includes(folder.id) && (
                        <>
                          <button 
                            onClick={() => {
                              const newName = prompt('새 폴더 이름:', folder.name);
                              if (newName && newName !== folder.name) {
                                const newDesc = prompt('새 폴더 설명:', folder.description);
                                const newColorInput = prompt('새 폴더 색상 (hex):', folder.color);
                                editFolderById(folder.id, newName, newDesc, newColorInput || folder.color);
                              }
                            }}
                            style={{ padding: '0.375rem', borderRadius: '0.25rem', border: 'none', background: '#f59e0b', color: 'white', cursor: 'pointer' }}
                            title="폴더 편집"
                          >
                            <PencilSimple size={14} />
                          </button>
                          <button 
                            onClick={() => deleteFolderById(folder.id)}
                            style={{ padding: '0.375rem', borderRadius: '0.25rem', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer' }}
                            title="폴더 삭제"
                          >
                            <Trash size={14} />
                          </button>
                        </>
                      )}
                      {['general'].includes(folder.id) && (
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', padding: '0.375rem' }}>기본 폴더</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => {
                setShowFolderManager(false);
                setNewFolderName('');
                setNewFolderDescription('');
                setNewFolderColor('#3b82f6');
              }} 
                style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#6b7280', color: 'white', cursor: 'pointer' }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 곡 이동 다이얼로그 */}
      {showMoveDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1f2937', borderRadius: '1rem', padding: '2rem', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowRight size={24} /> 곡 이동
            </h3>
            <p style={{ marginBottom: '1rem', color: '#d1d5db' }}>
              선택된 {selectedSongs.size}곡을 다음 폴더로 이동합니다:
            </p>
            <select 
              value={targetFolder} 
              onChange={(e) => setTargetFolder(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #6b7280', background: '#374151', color: 'white', fontSize: '1rem', marginBottom: '1rem' }}
            >
              <option value="">폴더를 선택하세요</option>
              {folderList.filter(f => f.id !== 'all').map(folder => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowMoveDialog(false); setTargetFolder(''); }} 
                style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#6b7280', color: 'white', cursor: 'pointer' }}>취소</button>
              <button onClick={async () => {
                if (targetFolder) {
                  await moveSongsToFolder(Array.from(selectedSongs), targetFolder);
                  setSelectedSongs(new Set());
                  setShowMoveDialog(false);
                  setTargetFolder('');
                }
              }} 
                style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer' }}>이동</button>
            </div>
          </div>
        </div>
      )}

      {/* 곡 편집 다이얼로그 */}
      {showSongEditDialog && editingSong && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1f2937', borderRadius: '1rem', padding: '2rem', maxWidth: '500px', width: '90%' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PencilSimple size={24} /> 곡 정보 수정
            </h3>
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#f3f4f6', fontSize: '0.875rem' }}>곡 제목</label>
                <input
                  type="text"
                  defaultValue={editingSong.title}
                  id="edit-title"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #6b7280', background: '#374151', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#f3f4f6', fontSize: '0.875rem' }}>아티스트</label>
                <input
                  type="text"
                  defaultValue={editingSong.artist}
                  id="edit-artist"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #6b7280', background: '#374151', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#f3f4f6', fontSize: '0.875rem' }}>폴더</label>
                <select
                  defaultValue={editingSong.folder}
                  id="edit-folder"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #6b7280', background: '#374151', color: 'white' }}
                >
                  {folderList.filter(f => f.id !== 'all').map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowSongEditDialog(false); setEditingSong(null); }} 
                style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#6b7280', color: 'white', cursor: 'pointer' }}>취소</button>
              <button onClick={() => {
                const title = document.getElementById('edit-title').value;
                const artist = document.getElementById('edit-artist').value;
                const folder = document.getElementById('edit-folder').value;
                updateSong(editingSong.id, { title, artist, folder });
              }} 
                style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer' }}>저장</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', left: '-9999px' }}>
        <YouTube videoId={currentMusic?.youtubeId || ''} opts={youtubeOpts} onReady={onPlayerReady} onStateChange={onPlayerStateChange} />
      </div>

      <main className={`main-layout ${isDesktop ? 'desktop' : 'mobile'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 스와이프 방향 표시 */}
        {swipeDirection && (
          <>
            <div className={`swipe-indicator left ${swipeDirection === 'right' ? 'active' : ''}`}>
              ⏮️
            </div>
            <div className={`swipe-indicator right ${swipeDirection === 'left' ? 'active' : ''}`}>
              ⏭️
            </div>
          </>
        )}

        <div className="playlist-section"
          ref={musicListRef}
        >
          <div style={{ marginBottom: '1rem' }}>
            {/* 폴더와 검색창을 한 줄에 배치 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              {/* 폴더 버튼들 */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {folderList.map(folder => (
                  <button key={folder.id} onClick={() => filterByFolder(folder.id)}
                    style={{ 
                      padding: '0.5rem 0.75rem', 
                      borderRadius: '0.5rem', 
                      border: 'none', 
                      background: selectedFolder === folder.id ? folder.color : '#4b5563', 
                      color: 'white', 
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: selectedFolder === folder.id ? '600' : '500',
                      boxShadow: selectedFolder === folder.id ? `0 0 0 2px ${folder.color}40` : 'none'
                    }}>
                    {folder.name} ({folder.songCount || 0})
                  </button>
                ))}
              </div>
              
              {/* 검색창 */}
              <div style={{ flex: '1', minWidth: '200px', maxWidth: '300px' }}>
                <input 
                  type="text" 
                  placeholder="곡 제목이나 아티스트 검색..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="search-input" 
                  style={{ width: '100%' }}
                />
              </div>
              
              {/* 관리자 모드 - 폴더 관리 버튼 */}
              {isAdminMode && (
                <button onClick={() => setShowFolderManager(true)}
                  style={{ 
                    padding: '0.5rem', 
                    borderRadius: '0.5rem', 
                    border: 'none', 
                    background: '#8b5cf6', 
                    color: 'white', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.25rem',
                    fontSize: '0.875rem'
                  }}>
                  <Gear size={14} /> 폴더 관리
                </button>
              )}
            </div>
          </div>

          {isAdminMode && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#374151', borderRadius: '0.5rem' }}>
              <h3 style={{ marginBottom: '0.75rem', color: '#f3f4f6' }}>🎵 YouTube 음악 추가</h3>
              <div style={{ 
                marginBottom: '0.5rem', 
                padding: '0.5rem', 
                background: 'rgba(59, 130, 246, 0.1)', 
                border: '1px solid rgba(59, 130, 246, 0.2)', 
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                color: '#93c5fd'
              }}>
                💡 광고 최소화 팁: 오래된 음악, 인디 아티스트, 공식 채널의 음악은 광고가 적습니다<br/>
                🎮 외부 장치 제어: {'mediaSession' in navigator ? '블루투스 헤드셋, 자동차 핸들 버튼으로 제어 가능 ✅' : '이 브라우저에서는 외부 장치 제어 미지원 ❌'}
              </div>
              <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '0.5rem' }}>
                <input type="text" placeholder="곡 제목 *" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} 
                  style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #6b7280', background: '#1f2937', color: 'white' }} />
                <input type="text" placeholder="아티스트" value={customArtist} onChange={(e) => setCustomArtist(e.target.value)} 
                  style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #6b7280', background: '#1f2937', color: 'white' }} />
                <select value={selectedFolderForNew} onChange={(e) => setSelectedFolderForNew(e.target.value)} 
                  style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #6b7280', background: '#1f2937', color: 'white' }}>
                  {folderList.filter(f => f.id !== 'all').map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" placeholder="YouTube URL 입력" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} 
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #6b7280', background: '#1f2937', color: 'white' }} />
                <button onClick={fetchYouTubeMetadata} 
                  style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  title="YouTube에서 제목과 아티스트를 자동으로 가져옵니다">
                  <Database size={16} /> 메타데이터
                </button>
                <button onClick={addYouTubeMusic} style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer' }}>
                  <Plus size={16} /> 추가
                </button>
              </div>
            </div>
          )}

          {/* 선택 재생 컨트롤 - 크기 축소 */}
          <div style={{ marginBottom: '0.75rem', padding: '0.5rem', background: '#374151', borderRadius: '0.375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.375rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#d1d5db' }}>
                <span>🎵</span>
                <span style={{ color: isSelectivePlayMode ? '#10b981' : '#3b82f6', fontWeight: '500' }}>
                  {isSelectivePlayMode ? `선택재생 (${currentPlaylist.length})` : `전체재생 (${filteredMusic.length})`}
                </span>
                {selectedSongsForPlay.size > 0 && (
                  <span style={{ color: '#f59e0b' }}>• {selectedSongsForPlay.size}곡</span>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                <button onClick={selectAllSongsForPlay}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: 'none', background: '#6366f1', color: 'white', cursor: 'pointer', fontSize: '0.7rem' }}>
                  전체선택
                </button>
                <button onClick={clearSongSelectionForPlay}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: 'none', background: '#6b7280', color: 'white', cursor: 'pointer', fontSize: '0.7rem' }}>
                  해제
                </button>
                <button onClick={playSelectedSongs}
                  disabled={selectedSongsForPlay.size === 0}
                  style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '0.25rem', 
                    border: 'none', 
                    background: selectedSongsForPlay.size > 0 ? '#10b981' : '#6b7280', 
                    color: 'white', 
                    cursor: selectedSongsForPlay.size > 0 ? 'pointer' : 'not-allowed', 
                    fontSize: '0.7rem',
                    fontWeight: '500'
                  }}>
                  ▶️ 선택재생
                </button>
                <button onClick={playAllSongs}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '500' }}>
                  🎵 전체재생
                </button>
              </div>
            </div>
          </div>

          {/* 모바일에서만 임베디드 플레이어 표시 */}
          {!isDesktop && (
            <div className={`embedded-player-section ${isMiniPlayer ? 'mini' : 'full'}`}>
              {/* 플레이어 토글 버튼 */}
              <button 
                className="embedded-player-toggle"
                onClick={() => setIsMiniPlayer(!isMiniPlayer)}
                title={isMiniPlayer ? '플레이어 확장' : '플레이어 축소'}
              >
                {isMiniPlayer ? '▼' : '▲'}
              </button>

              {/* 미니 플레이어와 풀 플레이어 내용 */}
              {isMiniPlayer ? (
                <div className="mini-player-content">
                  <div className="mini-top-section">
                    <img 
                      src={currentMusic?.artwork || "https://placehold.co/300x300/1f2937/ffffff?text=🎵"} 
                      alt="Album Art" 
                      className={`mini-album-art ${isPlaying ? 'playing' : ''}`}
                    />
                    {isPlaying && (
                      <div className="mini-wave-overlay">
                        <div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div>
                      </div>
                    )}
                    <div className="mini-song-info">
                      <div className="mini-title">{currentMusic?.title || "곡을 선택해주세요"}</div>
                      <div className="mini-artist">{currentMusic?.artist || "아티스트"}</div>
                    </div>
                  </div>

                  {/* 미니 진행바 */}
                  <div className="mini-progress-container">
                    <input type="range" min="0" max={duration || 100} value={currentTime} 
                      onChange={(e) => { setCurrentTime(parseFloat(e.target.value)); if (playerRef.current) playerRef.current.seekTo(parseFloat(e.target.value)); }} 
                      className="mini-progress-bar" />
                    <div className="mini-time-info">
                      <span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* 미니 메인 컨트롤 */}
                  <div className="mini-controls">
                    <button onClick={() => setIsShuffle(!isShuffle)} className={`mini-control-btn ${isShuffle ? 'active' : ''}`}>
                      <Shuffle size={18} />
                    </button>
                    <button onClick={prevSong} className="mini-control-btn">
                      <SkipBack size={22} weight="fill" />
                    </button>
                    <button onClick={togglePlayPause} className="mini-play-btn">
                      {isPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" />}
                    </button>
                    <button onClick={nextSong} className="mini-control-btn">
                      <SkipForward size={22} weight="fill" />
                    </button>
                    <button onClick={() => { const modes = ['none', 'all', 'one']; setRepeatMode(modes[(modes.indexOf(repeatMode) + 1) % modes.length]); }} 
                      className={`mini-control-btn ${repeatMode !== 'none' ? 'active' : ''}`}>
                      {repeatMode === 'one' ? <RepeatOnce size={18} /> : <Repeat size={18} />}
                    </button>
                  </div>

                  {/* 미니 볼륨 컨트롤 - 데스크톱에서만 표시 */}
                  {isDesktop && (
                    <div className="mini-volume-container">
                      <SpeakerHigh className="mini-volume-icon" size={16} />
                      <input type="range" min="0" max="100" step="1" value={volume} 
                        onChange={(e) => { setVolume(parseInt(e.target.value)); if (playerRef.current) playerRef.current.setVolume(parseInt(e.target.value)); }} 
                        className="mini-volume-slider" />
                      <span className="mini-volume-value">{volume}</span>
                    </div>
                  )}

                  {/* 미니 플레이리스트 정보 */}
                  <div className="mini-playlist-info">
                    <span>재생목록: {currentPlaylist.length}곡 | {currentIndex + 1}/{currentPlaylist.length || 1}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {cloudStatus === 'connected' && <span style={{ fontSize: '0.7rem', color: '#10b981' }}>🌐</span>}
                      {isAdminMode && <span style={{ fontSize: '0.7rem', color: '#8b5cf6' }}>🔐</span>}
                      <span style={{ fontSize: '0.6rem', color: '#93c5fd' }} title="광고 최소화 모드 활성화">💡</span>
                      {'mediaSession' in navigator && <span style={{ fontSize: '0.6rem', color: '#10b981' }} title="블루투스/외부 장치 제어 지원">🎮</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* 풀 플레이어 모드 */}
                  <div className="album-art-container">
                    <img src={currentMusic?.artwork || "https://placehold.co/300x300/1f2937/ffffff?text=🎵"} alt="Album Art" 
                      className={`album-art ${isPlaying ? 'playing' : ''}`} />
                    {isPlaying && (
                      <div className="wave-overlay">
                        <div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div>
                      </div>
                    )}
                  </div>

                  <div className="song-details">
                    <h2 className="current-title">{currentMusic?.title || "곡을 선택해주세요"}</h2>
                    <p className="current-artist">{currentMusic?.artist || "아티스트"}</p>
                  </div>

                  <div className="progress-container">
                    <input type="range" min="0" max={duration || 100} value={currentTime} 
                      onChange={(e) => { setCurrentTime(parseFloat(e.target.value)); if (playerRef.current) playerRef.current.seekTo(parseFloat(e.target.value)); }} className="progress-bar" />
                    <div className="time-info">
                      <span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="player-controls">
                    <button onClick={() => setIsShuffle(!isShuffle)} className={`control-btn ${isShuffle ? 'active' : ''}`}><Shuffle size={24} /></button>
                    <button onClick={prevSong} className="control-btn"><SkipBack size={32} weight="fill" /></button>
                    <button onClick={togglePlayPause} className="play-btn">{isPlaying ? <Pause size={32} weight="fill" /> : <Play size={32} weight="fill" />}</button>
                    <button onClick={nextSong} className="control-btn"><SkipForward size={32} weight="fill" /></button>
                    <button onClick={() => { const modes = ['none', 'all', 'one']; setRepeatMode(modes[(modes.indexOf(repeatMode) + 1) % modes.length]); }} 
                      className={`control-btn ${repeatMode !== 'none' ? 'active' : ''}`}>{repeatMode === 'one' ? <RepeatOnce size={24} /> : <Repeat size={24} />}</button>
                  </div>

                  {/* 볼륨 컨트롤 - 데스크톱에서만 표시 */}
                  {isDesktop && (
                    <div className="volume-container">
                      <SpeakerHigh className="volume-icon" size={20} />
                      <input type="range" min="0" max="100" step="1" value={volume} 
                        onChange={(e) => { setVolume(parseInt(e.target.value)); if (playerRef.current) playerRef.current.setVolume(parseInt(e.target.value)); }} className="volume-slider" />
                      <span className="volume-value">{volume}</span>
                    </div>
                  )}

                  <div className="playlist-info">
                    <p>재생목록: {currentPlaylist.length}곡</p>
                    <p>현재: {currentIndex + 1} / {currentPlaylist.length || 1}</p>
                    {cloudStatus === 'connected' && <p style={{ fontSize: '0.75rem', color: '#10b981' }}>🌐 구글 시트 연결됨</p>}
                    {isAdminMode && <p style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>🔐 관리자 모드</p>}
                    <div style={{ 
                      marginTop: '0.5rem', 
                      padding: '0.5rem', 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      border: '1px solid rgba(59, 130, 246, 0.2)', 
                      borderRadius: '0.25rem',
                      fontSize: '0.65rem',
                      color: '#93c5fd'
                    }}>
                      💡 광고 최소화 모드 활성화됨<br/>
                      • 낮은 화질로 재생<br/>
                      • 1초부터 시작<br/>
                      • 자동 스킵 시도<br/>
                      🎮 블루투스/외부 장치 제어 {'mediaSession' in navigator ? '✅ 지원' : '❌ 미지원'}<br/>
                      📱 모바일: 볼륨은 기기 버튼으로 조절하세요
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 관리자 모드 - 곡 관리 툴바 */}
          {isAdminMode && filteredMusic.length > 0 && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#374151', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ color: '#f3f4f6', margin: 0 }}>🎵 곡 관리</h4>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={selectAllSongs} 
                    style={{ padding: '0.5rem', borderRadius: '0.25rem', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '0.875rem' }}>
                    전체 선택
                  </button>
                  <button onClick={clearSongSelection} 
                    style={{ padding: '0.5rem', borderRadius: '0.25rem', border: 'none', background: '#6b7280', color: 'white', cursor: 'pointer', fontSize: '0.875rem' }}>
                    선택 해제
                  </button>
                  {selectedSongs.size > 0 && (
                    <button onClick={() => { setShowMoveDialog(true); setTargetFolder(''); }} 
                      style={{ padding: '0.5rem', borderRadius: '0.25rem', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ArrowRight size={14} /> {selectedSongs.size}곡 이동
                    </button>
                  )}
                </div>
              </div>
              
              {/* 곡 순서 관리 섹션 */}
              <div style={{ 
                marginTop: '0.75rem', 
                padding: '0.75rem', 
                background: hasOrderChanges ? 'rgba(251, 191, 36, 0.1)' : 'rgba(55, 65, 81, 0.5)', 
                border: hasOrderChanges ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(75, 85, 99, 0.3)',
                borderRadius: '0.375rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: hasOrderChanges ? '#fbbf24' : '#d1d5db' }}>
                      🔄 곡 순서 관리
                    </span>
                    {hasOrderChanges && (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: '#fbbf24', 
                        background: 'rgba(251, 191, 36, 0.2)', 
                        padding: '0.125rem 0.5rem', 
                        borderRadius: '0.25rem',
                        fontWeight: '500'
                      }}>
                        변경됨
                      </span>
                    )}
                  </div>
                  
                  {hasOrderChanges && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={cancelOrderChanges}
                        disabled={isSavingOrder}
                        style={{ 
                          padding: '0.375rem 0.75rem', 
                          borderRadius: '0.25rem', 
                          border: 'none', 
                          background: '#6b7280', 
                          color: 'white', 
                          cursor: isSavingOrder ? 'not-allowed' : 'pointer', 
                          fontSize: '0.8rem',
                          opacity: isSavingOrder ? 0.5 : 1
                        }}>
                        취소
                      </button>
                      <button 
                        onClick={savePlaylistOrder}
                        disabled={isSavingOrder}
                        style={{ 
                          padding: '0.375rem 0.75rem', 
                          borderRadius: '0.25rem', 
                          border: 'none', 
                          background: isSavingOrder ? '#9ca3af' : '#10b981', 
                          color: 'white', 
                          cursor: isSavingOrder ? 'not-allowed' : 'pointer', 
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                        {isSavingOrder ? (
                          <>
                            <div style={{ 
                              width: '12px', 
                              height: '12px', 
                              border: '2px solid transparent',
                              borderTop: '2px solid white',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }}></div>
                            저장 중...
                          </>
                        ) : (
                          <>💾 순서 저장</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: hasOrderChanges ? '#fbbf24' : '#9ca3af', 
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {hasOrderChanges ? (
                    <>
                      드래그로 곡 순서를 변경했습니다. <strong>'순서 저장'</strong> 버튼을 클릭하여 구글 시트에 저장하세요.
                    </>
                  ) : (
                    <>
                      곡을 드래그하여 순서를 변경할 수 있습니다. 변경 후 저장 버튼이 나타납니다.
                    </>
                  )}
                </p>
              </div>
              
              {selectedSongs.size > 0 && (
                <p style={{ color: '#d1d5db', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
                  {selectedSongs.size}곡이 선택되었습니다.
                </p>
              )}
            </div>
          )}

          <div className="music-list">
            {loading || showSkeletonUI ? (
              <SkeletonUI />
            ) : filteredMusic.length === 0 ? (
              <div className="no-results"><p>🔍 검색 결과가 없습니다.</p></div>
            ) : (
              filteredMusic.map((song, index) => (
                <div 
                  key={song.id} 
                  className={`song-item ${currentMusic?.id === song.id ? 'playing' : ''} ${draggedSong?.index === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''} ${hasOrderChanges ? 'order-changed' : ''}`} 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  draggable={isAdminMode}
                  onDragStart={(e) => handleDragStart(e, song, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  
                  {/* 순서 번호 표시 (관리자 모드에서만) */}
                  {isAdminMode && (
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      background: hasOrderChanges ? 'rgba(251, 191, 36, 0.2)' : 'rgba(55, 65, 81, 0.8)', 
                      border: hasOrderChanges ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(75, 85, 99, 0.4)',
                      borderRadius: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: hasOrderChanges ? '#fbbf24' : '#9ca3af',
                      cursor: 'grab',
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </div>
                  )}
                  
                  {/* 선택 재생용 체크박스 (모든 모드에서 표시) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedSongsForPlay.has(song.id)}
                      onChange={() => toggleSongForPlay(song.id)}
                      style={{ cursor: 'pointer' }}
                      title="재생 목록에 추가/제거"
                    />
                    {isAdminMode && (
                      <input
                        type="checkbox"
                        checked={selectedSongs.has(song.id)}
                        onChange={() => toggleSongSelection(song.id)}
                        style={{ cursor: 'pointer', transform: 'scale(0.8)' }}
                        title="곡 이동용 선택"
                      />
                    )}
                  </div>
                  
                  <img src={song.artwork} alt={song.title} className="song-artwork" />
                  
                  <div className="song-info" onClick={() => handleSongSelect(song, index)} style={{ flex: 1 }}>
                    <p className="song-title">{song.title} {song.addedBy === 'User' && <span style={{ fontSize: '0.7rem', color: '#10b981' }}>✨</span>}</p>
                    <p className="song-artist">{song.artist}</p>
                    {isAdminMode && (
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
                        폴더: {folderList.find(f => f.id === song.folder)?.name || '알 수 없음'}
                      </p>
                    )}
                  </div>

                  {/* 관리자 모드 - 곡 관리 버튼들 */}
                  {isAdminMode && (
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      {/* 폴더 변경 드롭다운 */}
                      <select
  value={song.folder}
  onChange={async (e) => {
    e.stopPropagation();
    const newFolderId = e.target.value;
    if (newFolderId !== song.folder) {
      console.log(`드롭다운에서 곡 이동: ${song.id} (${song.title}) → ${newFolderId}`);
      await moveSingleSongToFolder(song.id, newFolderId);
    }
  }}
  onClick={(e) => e.stopPropagation()}
  style={{ padding: '0.25rem', borderRadius: '0.25rem', border: '1px solid #6b7280', background: '#374151', color: 'white', fontSize: '0.75rem', cursor: 'pointer' }}
  title="폴더 이동"
>
  {folderList.filter(f => f.id !== 'all').map(folder => (
    <option key={folder.id} value={folder.id}>{folder.name}</option>
  ))}
</select>
                      
                      {/* 곡 편집 버튼 */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); editSong(song); }} 
                        style={{ padding: '0.375rem', borderRadius: '0.25rem', border: 'none', background: '#f59e0b', color: 'white', cursor: 'pointer' }}
                        title="곡 편집"
                      >
                        <PencilSimple size={14} />
                      </button>

                      {/* 곡 삭제 버튼 (사용자 추가 곡만) */}
                      {song.addedBy === 'User' && (
                        <button onClick={(e) => { e.stopPropagation(); deleteSong(song.id); }} 
                          style={{ padding: '0.375rem', borderRadius: '0.25rem', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer' }}
                          title="곡 삭제"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        </div>

        {/* 데스크톱에서만 별도 플레이어 섹션 표시 */}
        {isDesktop && (
          <div className="player-section">
            <div className="album-art-container">
              <img src={currentMusic?.artwork || "https://placehold.co/300x300/1f2937/ffffff?text=🎵"} alt="Album Art" 
                className={`album-art ${isPlaying ? 'playing' : ''}`} />
              {isPlaying && (
                <div className="wave-overlay">
                  <div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div>
                </div>
              )}
            </div>

            <div className="song-details">
              <h2 className="current-title">{currentMusic?.title || "곡을 선택해주세요"}</h2>
              <p className="current-artist">{currentMusic?.artist || "아티스트"}</p>
            </div>

            <div className="progress-container">
              <input type="range" min="0" max={duration || 100} value={currentTime} 
                onChange={(e) => { setCurrentTime(parseFloat(e.target.value)); if (playerRef.current) playerRef.current.seekTo(parseFloat(e.target.value)); }} className="progress-bar" />
              <div className="time-info">
                <span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="player-controls">
              <button onClick={() => setIsShuffle(!isShuffle)} className={`control-btn ${isShuffle ? 'active' : ''}`}><Shuffle size={24} /></button>
              <button onClick={prevSong} className="control-btn"><SkipBack size={32} weight="fill" /></button>
              <button onClick={togglePlayPause} className="play-btn">{isPlaying ? <Pause size={32} weight="fill" /> : <Play size={32} weight="fill" />}</button>
              <button onClick={nextSong} className="control-btn"><SkipForward size={32} weight="fill" /></button>
              <button onClick={() => { const modes = ['none', 'all', 'one']; setRepeatMode(modes[(modes.indexOf(repeatMode) + 1) % modes.length]); }} 
                className={`control-btn ${repeatMode !== 'none' ? 'active' : ''}`}>{repeatMode === 'one' ? <RepeatOnce size={24} /> : <Repeat size={24} />}</button>
            </div>

            <div className="volume-container">
              <SpeakerHigh className="volume-icon" size={20} />
              <input type="range" min="0" max="100" step="1" value={volume} 
                onChange={(e) => { setVolume(parseInt(e.target.value)); if (playerRef.current) playerRef.current.setVolume(parseInt(e.target.value)); }} className="volume-slider" />
              <span className="volume-value">{volume}</span>
            </div>

            <div className="playlist-info">
              <p>재생목록: {currentPlaylist.length}곡</p>
              <p>현재: {currentIndex + 1} / {currentPlaylist.length || 1}</p>
              {cloudStatus === 'connected' && <p style={{ fontSize: '0.75rem', color: '#10b981' }}>🌐 구글 시트 연결됨</p>}
              {isAdminMode && <p style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>🔐 관리자 모드</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;