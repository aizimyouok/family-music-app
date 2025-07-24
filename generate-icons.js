const fs = require('fs');
const { createCanvas } = require('canvas');

// 아이콘 생성 함수
function createMusicIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // 배경 그라데이션
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(0.5, '#8b5cf6');
    gradient.addColorStop(1, '#ec4899');
    
    // 둥근 배경
    const radius = size * 0.25;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, radius);
    ctx.fill();
    
    // 음표 그리기 (수동으로 그림)
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size * 0.03;
    
    const centerX = size * 0.5;
    const centerY = size * 0.5;
    const noteSize = size * 0.15;
    
    // 첫 번째 음표
    ctx.beginPath();
    ctx.ellipse(centerX - noteSize, centerY + noteSize * 0.5, noteSize * 0.8, noteSize * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 첫 번째 음표 줄기
    ctx.beginPath();
    ctx.rect(centerX - noteSize + noteSize * 0.6, centerY - noteSize * 1.5, noteSize * 0.2, noteSize * 2);
    ctx.fill();
    
    // 두 번째 음표
    ctx.beginPath();
    ctx.ellipse(centerX + noteSize * 0.3, centerY + noteSize * 0.3, noteSize * 0.7, noteSize * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 두 번째 음표 줄기
    ctx.beginPath();
    ctx.rect(centerX + noteSize * 0.3 + noteSize * 0.5, centerY - noteSize * 1.2, noteSize * 0.18, noteSize * 1.5);
    ctx.fill();
    
    return canvas.toBuffer('image/png');
}

// 192x192 아이콘 생성
const icon192 = createMusicIcon(192);
fs.writeFileSync('./public/pwa-192x192.png', icon192);

// 512x512 아이콘 생성
const icon512 = createMusicIcon(512);
fs.writeFileSync('./public/pwa-512x512.png', icon512);

console.log('✅ PWA 아이콘 생성 완료!');
