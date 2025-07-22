import { useEffect, useState, useRef } from "react";
import YouTube from 'react-youtube';
import { 
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, RepeatOnce, 
  SpeakerHigh, Plus, Link, Cloud, CloudSlash, PencilSimple, Trash, 
  Check, X, Folder, MusicNote
} from "phosphor-react";
import "./App.css";

// GitHub 저장소 설정 (곡 목록 관리용)
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/aizimyouok/family-music-app/main';
const DATA_BASE_URL = `${GITHUB_BASE_URL}/data`;

function App() {
  const [musicList, setMusicList] = useState([]);
  const [artistList, setArtistList] = useState([]);
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
  const [selectedSongs, setSelectedSongs] = useState(new Set());
  const [selectedArtist, setSelectedArtist] = useState('all');
  
  // YouTube URL 추가 관련 상태
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  
  // 클라우드 동기화 상태
  const [cloudStatus, setCloudStatus] = useState('disconnected');
  
  // 음악 편집/삭제 관련 상태
  const [editingSong, setEditingSong] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  
  const playerRef = useRef(null);
  const progressInterval = useRef(null);

  useEffect(() => {
    loadMusicData();
  }, []);

  // 깃허브에서 음악 데이터 로드
  const loadMusicData = async () => {
    try {
      setCloudStatus('syncing');
      
      // 1. 아티스트 목록 로드
      console.log('아티스트 목록 로드 시작...');
      const artistResponse = await fetch(`${DATA_BASE_URL}/artists.json`);
      const artistData = await artistResponse.json();
      setArtistList(artistData.artists);
      
      // 2. 각 아티스트별 곡 목록 로드
      console.log('각 아티스트별 곡 목록 로드 시작...');
      const allSongs = [];
      
      for (const artist of artistData.artists) {
        try {
          const songResponse = await fetch(`${DATA_BASE_URL}/artists/${artist.folder}/songs.json`);
          const songs = await songResponse.json();
          
          // 각 곡에 앨범 아트워크 URL 추가
          const songsWithArtwork = songs.map(song => ({
            ...song,
            artwork: `https://img.youtube.com/vi/${song.youtubeId}/maxresdefault.jpg`
          }));
          
          allSongs.push(...songsWithArtwork);
          console.log(`${artist.name}: ${songs.length}곡 로드됨`);
        } catch (error) {
          console.error(`${artist.name} 곡 목록 로드 실패:`, error);
        }
      }
      
      // 3. localStorage에서 사용자 추가 곡들 로드
      const userSongs = JSON.parse(localStorage.getItem('tempUserSongs') || '[]');
      const allSongsWithUser = [...allSongs, ...userSongs];
      
      console.log(`전체 음악 로드 완료: ${allSongsWithUser.length}곡 (기본: ${allSongs.length}, 사용자: ${userSongs.length})`);
      
      setMusicList(allSongsWithUser);
      setCurrentPlaylist(allSongsWithUser);
      setCloudStatus('connected');
      setLoading(false);
      
    } catch (error) {
      console.error("음악 데이터 로드 실패:", error);
      setCloudStatus('disconnected');
      
      // 로컬 백업 데이터 시도
      await loadLocalBackup();
      setLoading(false);
    }
  };

  // 로컬 백업 데이터 로드
  const loadLocalBackup = async () => {
    try {
      const userSongs = JSON.parse(localStorage.getItem('tempUserSongs') || '[]');
      setMusicList(userSongs);
      setCurrentPlaylist(userSongs);
      console.log('로컬 백업 데이터 로드:', userSongs.length, '곡');
    } catch (error) {
      console.error('로컬 백업 로드 실패:', error);
      setMusicList([]);
      setCurrentPlaylist([]);
    }
  };

  // 아티스트별 필터링
  const filterByArtist = (artistId) => {
    setSelectedArtist(artistId);
    setSearchTerm('');
    
    if (artistId === 'all') {
      setCurrentPlaylist(musicList);
    } else if (artistId === 'user') {
      const userSongs = musicList.filter(song => !song.isDefault);
      setCurrentPlaylist(userSongs);
    } else {
      const artist = artistList.find(a => a.id === artistId);
      if (artist) {
        const artistSongs = musicList.filter(song => song.artist === artist.name);
        setCurrentPlaylist(artistSongs);
      }
    }
  };

  // YouTube URL에서 Video ID 추출하는 함수
  const extractYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // YouTube URL로 음악 추가하는 함수
  const addYouTubeMusic = () => {
    const videoId = extractYouTubeId(youtubeUrl);
    
    if (!videoId) {
      alert('유효한 YouTube URL을 입력해주세요.\\n예: https://www.youtube.com/watch?v=VIDEO_ID');
      return;
    }

    if (!customTitle.trim()) {
      alert('곡 제목을 입력해주세요.');
      return;
    }

    const newSong = {
      id: `custom_${Date.now()}`,
      title: customTitle.trim(),
      artist: customArtist.trim() || '알 수 없는 아티스트',
      youtubeId: videoId,
      artwork: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: 0,
      album: '사용자 추가',
      year: new Date().getFullYear(),
      genre: 'User Added',
      isDefault: false,
      addedAt: new Date().toISOString()
    };

    // 음악 목록에 추가
    const updatedList = [...musicList, newSong];
    setMusicList(updatedList);
    
    // 현재 필터에 따라 플레이리스트 업데이트
    if (selectedArtist === 'all' || selectedArtist === 'user') {
      setCurrentPlaylist(updatedList.filter(song => 
        selectedArtist === 'all' || (selectedArtist === 'user' && !song.isDefault)
      ));
    }
    
    console.log('음악 추가됨:', newSong.title, '총', updatedList.length, '곡');
    
    // localStorage에 사용자 추가 곡들만 저장
    const userSongs = updatedList.filter(song => !song.isDefault);
    localStorage.setItem('tempUserSongs', JSON.stringify(userSongs));
    
    // 입력 필드 초기화
    setYoutubeUrl('');
    setCustomTitle('');
    setCustomArtist('');
    
    alert(`"${newSong.title}"이(가) 플레이리스트에 추가되었습니다!\\n\\n📝 로컬 저장됨: 새로고침해도 유지됩니다.\\n🌐 깃허브 동기화는 수동으로 진행해주세요!`);
  };
  // 음악 삭제 함수
  const deleteSong = (songId) => {
    const songToDelete = musicList.find(song => song.id === songId);
    
    if (songToDelete?.isDefault) {
      alert('기본 제공 곡은 삭제할 수 없습니다.');
      return;
    }

    if (confirm(`"${songToDelete?.title}"을(를) 삭제하시겠습니까?`)) {
      const updatedList = musicList.filter(song => song.id !== songId);
      setMusicList(updatedList);
      
      // 현재 필터에 따라 플레이리스트 업데이트
      filterByArtist(selectedArtist);
      
      console.log('음악 삭제됨:', songToDelete?.title, '남은 곡:', updatedList.length);
      
      // 현재 재생 중인 곡이 삭제된 곡이면 재생 중단
      if (currentMusic?.id === songId) {
        setCurrentMusic(null);
        setCurrentIndex(0);
        setIsPlaying(false);
        if (playerRef.current) {
          playerRef.current.pauseVideo();
        }
      } else {
        // 현재 곡이 삭제되지 않았다면 인덱스 재조정
        const newIndex = currentPlaylist.findIndex(song => song.id === currentMusic?.id);
        if (newIndex >= 0) {
          setCurrentIndex(newIndex);
        }
      }
      
      // localStorage 업데이트
      const userSongs = updatedList.filter(song => !song.isDefault);
      localStorage.setItem('tempUserSongs', JSON.stringify(userSongs));
      
      alert('곡이 삭제되었습니다.');
    }
  };

  // 음악 편집 시작
  const startEditSong = (song) => {
    if (song.isDefault) {
      alert('기본 제공 곡은 편집할 수 없습니다.');
      return;
    }
    
    setEditingSong(song.id);
    setEditTitle(song.title);
    setEditArtist(song.artist);
  };

  // 음악 편집 저장
  const saveEditSong = () => {
    if (!editTitle.trim()) {
      alert('곡 제목을 입력해주세요.');
      return;
    }

    const updatedList = musicList.map(song => {
      if (song.id === editingSong) {
        return {
          ...song,
          title: editTitle.trim(),
          artist: editArtist.trim() || '알 수 없는 아티스트'
        };
      }
      return song;
    });

    setMusicList(updatedList);
    
    // 현재 필터에 따라 플레이리스트 업데이트
    filterByArtist(selectedArtist);
    
    console.log('음악 정보 수정됨:', editTitle.trim());
    
    // localStorage 업데이트
    const userSongs = updatedList.filter(song => !song.isDefault);
    localStorage.setItem('tempUserSongs', JSON.stringify(userSongs));
    
    // 편집 모드 종료
    setEditingSong(null);
    setEditTitle('');
    setEditArtist('');
    
    alert('곡 정보가 수정되었습니다.');
  };

  // 음악 편집 취소
  const cancelEdit = () => {
    setEditingSong(null);
    setEditTitle('');
    setEditArtist('');
  };

  // YouTube 플레이어 설정
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
    },
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    console.log("YouTube 플레이어 준비 완료");
    
    // 플레이어가 준비되면 대기 중인 곡이 있다면 로드
    if (currentMusic && currentMusic.youtubeId) {
      console.log("대기 중인 곡 로드:", currentMusic.title);
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.loadVideoById(currentMusic.youtubeId);
          playerRef.current.setVolume(volume);
        }
      }, 500);
    }
  };

  const onPlayerStateChange = (event) => {
    const { data } = event;
    
    if (data === 1) { // 재생 중
      setIsPlaying(true);
      startProgressTracking();
    } else if (data === 2) { // 일시정지
      setIsPlaying(false);
      stopProgressTracking();
    } else if (data === 0) { // 종료
      setIsPlaying(false);
      stopProgressTracking();
      handleSongEnd();
    }
  };

  const startProgressTracking = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    
    progressInterval.current = setInterval(() => {
      if (playerRef.current) {
        const current = playerRef.current.getCurrentTime();
        const total = playerRef.current.getDuration();
        setCurrentTime(current);
        setDuration(total);
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
    console.log('loadSong 호출:', song.title, 'index:', index, 'playlist 길이:', currentPlaylist.length);
    setCurrentMusic(song);
    setCurrentIndex(index);
    
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      try {
        playerRef.current.loadVideoById(song.youtubeId);
        playerRef.current.setVolume(volume);
        console.log('YouTube 비디오 로드 성공:', song.youtubeId);
      } catch (error) {
        console.error('YouTube 비디오 로드 실패:', error);
        setTimeout(() => loadSong(song, index), 1000);
      }
    } else {
      console.log('플레이어가 아직 준비되지 않음, 1초 후 재시도');
      setTimeout(() => loadSong(song, index), 1000);
    }
  };

  const playSong = () => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      try {
        console.log('재생 시도:', currentMusic?.title);
        playerRef.current.playVideo();
      } catch (error) {
        console.error('재생 실패:', error);
        setTimeout(playSong, 1000);
      }
    } else {
      console.log('플레이어가 준비되지 않음, 재생 대기 중...');
      setTimeout(playSong, 1000);
    }
  };

  const pauseSong = () => {
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseSong();
    } else {
      if (currentMusic) {
        playSong();
      } else if (currentPlaylist.length > 0) {
        loadSong(currentPlaylist[0], 0);
        setTimeout(playSong, 2000);
      }
    }
  };

  const nextSong = () => {
    console.log('nextSong 호출 - currentPlaylist 길이:', currentPlaylist.length, 'currentIndex:', currentIndex);
    
    if (currentPlaylist.length === 0) {
      console.log('플레이리스트가 비어있음');
      return;
    }
    
    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * currentPlaylist.length);
    } else {
      nextIndex = (currentIndex + 1) % currentPlaylist.length;
    }
    
    console.log('다음 곡 인덱스:', nextIndex, '곡명:', currentPlaylist[nextIndex]?.title);
    
    if (currentPlaylist[nextIndex]) {
      loadSong(currentPlaylist[nextIndex], nextIndex);
      setTimeout(playSong, 2000);
    } else {
      console.error('다음 곡을 찾을 수 없음');
    }
  };

  const prevSong = () => {
    console.log('prevSong 호출 - currentPlaylist 길이:', currentPlaylist.length, 'currentIndex:', currentIndex);
    
    if (currentPlaylist.length === 0) return;
    
    const prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    
    console.log('이전 곡 인덱스:', prevIndex, '곡명:', currentPlaylist[prevIndex]?.title);
    
    if (currentPlaylist[prevIndex]) {
      loadSong(currentPlaylist[prevIndex], prevIndex);
      setTimeout(playSong, 2000);
    }
  };

  const handleSongEnd = () => {
    if (repeatMode === 'one') {
      setTimeout(playSong, 1000);
    } else if (repeatMode === 'all' || currentIndex < currentPlaylist.length - 1) {
      nextSong();
    } else {
      setIsPlaying(false);
    }
  };

  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (playerRef.current) {
      playerRef.current.seekTo(newTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 검색 및 필터링된 음악 목록
  const filteredMusic = currentPlaylist.filter(song => 
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSongSelect = (song, listIndex) => {
    console.log('handleSongSelect 호출:', song.title);
    
    const currentFilteredList = filteredMusic.length > 0 ? filteredMusic : currentPlaylist;
    console.log('플레이리스트 설정:', currentFilteredList.length, '곡');
    
    setCurrentPlaylist(currentFilteredList);
    
    const songIndex = currentFilteredList.findIndex(s => s.id === song.id);
    console.log('선택된 곡 인덱스:', songIndex);
    
    if (songIndex >= 0) {
      loadSong(song, songIndex);
      setTimeout(playSong, 2000);
    } else {
      console.error('곡을 플레이리스트에서 찾을 수 없음');
    }
  };
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
    if (selectedSongs.size === filteredMusic.length) {
      setSelectedSongs(new Set());
    } else {
      setSelectedSongs(new Set(filteredMusic.map(song => song.id)));
    }
  };

  const playSelectedSongs = () => {
    if (selectedSongs.size === 0) {
      alert('재생할 곡을 선택해주세요.');
      return;
    }
    
    const selectedPlaylist = musicList.filter(song => selectedSongs.has(song.id));
    console.log('선택된 곡들:', selectedPlaylist.length, '곡');
    
    setCurrentPlaylist(selectedPlaylist);
    
    if (selectedPlaylist.length > 0) {
      loadSong(selectedPlaylist[0], 0);
      setTimeout(playSong, 2000);
    }
  };

  // 클라우드 상태 표시 아이콘
  const CloudStatusIcon = () => {
    switch(cloudStatus) {
      case 'connected':
        return <Cloud size={16} style={{ color: '#10b981' }} title="깃허브 연결됨" />;
      case 'syncing':
        return <Cloud size={16} style={{ color: '#f59e0b', animation: 'pulse 2s infinite' }} title="동기화 중..." />;
      default:
        return <CloudSlash size={16} style={{ color: '#ef4444' }} title="깃허브 연결 안됨" />;
    }
  };

  return (
    <div className="container">
      {/* 헤더 */}
      <header className="header">
        <h1 className="app-title">🎵 가족 음악 앱</h1>
        <p className="welcome-message" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <CloudStatusIcon />
          {cloudStatus === 'connected' && '깃허브 연결됨'}
          {cloudStatus === 'syncing' && '데이터 로딩 중...'}
          {cloudStatus === 'disconnected' && '로컬 모드'}
          🎉
        </p>
      </header>

      {/* 숨겨진 YouTube 플레이어 */}
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <YouTube
          videoId={currentMusic?.youtubeId || ''}
          opts={youtubeOpts}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
        />
      </div>

      <main className="main-layout">
        {/* 플레이리스트 섹션 */}
        <div className="playlist-section">
          {/* 아티스트 필터 */}
          <div className="artist-filter" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem', color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Folder size={20} />
              🎭 아티스트별 보기
            </h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <button
                onClick={() => filterByArtist('all')}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: selectedArtist === 'all' ? '#3b82f6' : '#4b5563',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                전체 ({musicList.length})
              </button>
              
              <button
                onClick={() => filterByArtist('user')}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: selectedArtist === 'user' ? '#3b82f6' : '#4b5563',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                ✨ 내가 추가한 곡 ({musicList.filter(s => !s.isDefault).length})
              </button>
              
              {artistList.map(artist => (
                <button
                  key={artist.id}
                  onClick={() => filterByArtist(artist.id)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: selectedArtist === artist.id ? '#3b82f6' : '#4b5563',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {artist.name} ({musicList.filter(s => s.artist === artist.name).length})
                </button>
              ))}
            </div>
          </div>

          {/* YouTube URL 직접 추가 */}
          <div className="youtube-add-section" style={{ marginBottom: '1rem', padding: '1rem', background: '#374151', borderRadius: '0.5rem' }}>
            <h3 style={{ marginBottom: '0.75rem', color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link size={20} />
              🎵 YouTube 음악 추가하기
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'normal' }}>
                ({musicList.filter(s => !s.isDefault).length}곡 추가됨)
              </span>
            </h3>
            
            <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr', marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder="곡 제목 *"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.25rem',
                  border: '1px solid #6b7280',
                  background: '#1f2937',
                  color: 'white',
                  fontSize: '0.875rem'
                }}
              />
              <input
                type="text"
                placeholder="아티스트 (선택사항)"
                value={customArtist}
                onChange={(e) => setCustomArtist(e.target.value)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.25rem',
                  border: '1px solid #6b7280',
                  background: '#1f2937',
                  color: 'white',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="YouTube URL 입력 (예: https://www.youtube.com/watch?v=...)"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '0.25rem',
                  border: '1px solid #6b7280',
                  background: '#1f2937',
                  color: 'white',
                  fontSize: '0.875rem'
                }}
              />
              <button
                onClick={addYouTubeMusic}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                  border: 'none',
                  background: '#10b981',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                <Plus size={16} />
                추가
              </button>
            </div>
            
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
              💡 로컬 저장: 새로고침해도 유지됩니다. 깃허브 동기화는 수동으로 진행해주세요!
            </div>
          </div>
          {/* 검색 및 컨트롤 */}
          <div className="search-controls">
            <input 
              type="text" 
              placeholder="곡 제목이나 아티스트 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="control-buttons">
              <button 
                onClick={selectAllSongs}
                className="btn btn-gray"
              >
                {selectedSongs.size === filteredMusic.length ? '전체 해제' : '전체 선택'}
              </button>
              <button 
                onClick={playSelectedSongs}
                className="btn btn-blue"
              >
                선택 곡 재생
              </button>
            </div>
          </div>

          {/* 현재 필터 정보 */}
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#1a1a2e', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <MusicNote size={16} />
              현재 보기: {selectedArtist === 'all' ? '전체 곡' : selectedArtist === 'user' ? '내가 추가한 곡' : artistList.find(a => a.id === selectedArtist)?.name}
            </div>
            <div>표시된 곡: {filteredMusic.length}곡 / 전체: {musicList.length}곡</div>
          </div>

          {/* 음악 목록 */}
          <div className="music-list">
            {loading ? (
              <div className="loading">
                <div className="loader"></div>
                <p>깃허브에서 음악 목록을 불러오는 중...</p>
              </div>
            ) : filteredMusic.length === 0 ? (
              <div className="no-results">
                <p>🔍 검색 결과가 없습니다.</p>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    style={{
                      marginTop: '1rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: '#3b82f6',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    전체 곡 보기
                  </button>
                )}
              </div>
            ) : (
              filteredMusic.map((song, index) => (
                <div 
                  key={song.id}
                  className={`song-item ${currentMusic?.id === song.id ? 'playing' : ''}`}
                >
                  <input 
                    type="checkbox" 
                    id={`check-${song.id}`}
                    className="song-checkbox" 
                    checked={selectedSongs.has(song.id)}
                    onChange={() => toggleSongSelection(song.id)}
                  />
                  <label htmlFor={`check-${song.id}`} className="checkbox-label"></label>
                  
                  <img 
                    src={song.artwork} 
                    alt={song.title}
                    className="song-artwork"
                  />
                  
                  {editingSong === song.id ? (
                    // 편집 모드
                    <div className="song-info" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: '1px solid #6b7280',
                            background: '#1f2937',
                            color: 'white',
                            fontSize: '0.875rem'
                          }}
                          placeholder="곡 제목"
                        />
                        <input
                          type="text"
                          value={editArtist}
                          onChange={(e) => setEditArtist(e.target.value)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: '1px solid #6b7280',
                            background: '#1f2937',
                            color: 'white',
                            fontSize: '0.875rem'
                          }}
                          placeholder="아티스트"
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={saveEditSong}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: 'none',
                            background: '#10b981',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Check size={12} /> 저장
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: 'none',
                            background: '#6b7280',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <X size={12} /> 취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 일반 모드
                    <>
                      <div 
                        className="song-info"
                        onClick={() => handleSongSelect(song, index)}
                        style={{ flex: 1 }}
                      >
                        <p className="song-title">
                          {song.title}
                          {!song.isDefault && <span style={{ fontSize: '0.7rem', color: '#10b981', marginLeft: '0.5rem' }}>✨</span>}
                          {song.isDefault && <span style={{ fontSize: '0.7rem', color: '#3b82f6', marginLeft: '0.5rem' }}>🏛️</span>}
                        </p>
                        <p className="song-artist">{song.artist}</p>
                        {song.album && song.year && (
                          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{song.album} • {song.year}</p>
                        )}
                      </div>
                      
                      {/* 편집/삭제 버튼 */}
                      {!song.isDefault && (
                        <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditSong(song);
                            }}
                            style={{
                              padding: '0.375rem',
                              borderRadius: '0.25rem',
                              border: 'none',
                              background: '#3b82f6',
                              color: 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="편집"
                          >
                            <PencilSimple size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSong(song.id);
                            }}
                            style={{
                              padding: '0.375rem',
                              borderRadius: '0.25rem',
                              border: 'none',
                              background: '#ef4444',
                              color: 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="삭제"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        {/* 플레이어 섹션 */}
        <div className="player-section">
          {/* 앨범 아트 */}
          <div className="album-art-container">
            <img 
              src={currentMusic?.artwork || "https://placehold.co/300x300/1f2937/ffffff?text=🎵"} 
              alt="Album Art" 
              className={`album-art ${isPlaying ? 'playing' : ''}`}
            />
            {isPlaying && (
              <div className="wave-overlay">
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
              </div>
            )}
          </div>

          {/* 곡 정보 */}
          <div className="song-details">
            <h2 className="current-title">
              {currentMusic?.title || "곡을 선택해주세요"}
            </h2>
            <p className="current-artist">
              {currentMusic?.artist || "아티스트"}
            </p>
            {currentMusic?.album && currentMusic?.year && (
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                {currentMusic.album} • {currentMusic.year}
              </p>
            )}
          </div>

          {/* 진행바 */}
          <div className="progress-container">
            <input 
              type="range" 
              min="0" 
              max={duration || 100} 
              value={currentTime}
              onChange={handleProgressChange}
              className="progress-bar"
            />
            <div className="time-info">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* 플레이어 컨트롤 */}
          <div className="player-controls">
            <button 
              onClick={() => setIsShuffle(!isShuffle)}
              className={`control-btn ${isShuffle ? 'active' : ''}`}
              title="셔플"
            >
              <Shuffle size={24} />
            </button>
            
            <button 
              onClick={prevSong}
              className="control-btn"
              title="이전 곡"
            >
              <SkipBack size={32} weight="fill" />
            </button>
            
            <button 
              onClick={togglePlayPause}
              className="play-btn"
              title={isPlaying ? "일시정지" : "재생"}
            >
              {isPlaying ? <Pause size={32} weight="fill" /> : <Play size={32} weight="fill" />}
            </button>
            
            <button 
              onClick={nextSong}
              className="control-btn"
              title="다음 곡"
            >
              <SkipForward size={32} weight="fill" />
            </button>
            
            <button 
              onClick={() => {
                const modes = ['none', 'all', 'one'];
                const currentIndex = modes.indexOf(repeatMode);
                const nextMode = modes[(currentIndex + 1) % modes.length];
                setRepeatMode(nextMode);
              }}
              className={`control-btn ${repeatMode !== 'none' ? 'active' : ''}`}
              title={`반복: ${repeatMode === 'none' ? '없음' : repeatMode === 'all' ? '전체' : '한 곡'}`}
            >
              {repeatMode === 'one' ? <RepeatOnce size={24} /> : <Repeat size={24} />}
            </button>
          </div>

          {/* 볼륨 컨트롤 */}
          <div className="volume-container">
            <SpeakerHigh className="volume-icon" size={20} />
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="1" 
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
            <span className="volume-value">{volume}</span>
          </div>

          {/* 현재 재생목록 정보 */}
          <div className="playlist-info">
            <p>재생목록: {currentPlaylist.length}곡</p>
            <p>현재: {currentIndex + 1} / {currentPlaylist.length}</p>
            {cloudStatus === 'connected' && (
              <p style={{ fontSize: '0.75rem', color: '#10b981' }}>
                🌐 깃허브 연결됨
              </p>
            )}
            {musicList.filter(s => !s.isDefault).length > 0 && (
              <p style={{ fontSize: '0.75rem', color: '#10b981' }}>
                ✨ {musicList.filter(s => !s.isDefault).length}곡 추가됨
              </p>
            )}
          </div>

          {/* 데이터 상태 정보 */}
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#1a1a2e', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              📊 데이터 소스: {cloudStatus === 'connected' ? '깃허브 저장소' : '로컬 백업'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>기본 곡: {musicList.filter(s => s.isDefault).length}개</span>
              <span>추가 곡: {musicList.filter(s => !s.isDefault).length}개</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;