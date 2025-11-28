// 🖼️ 全画像リスト（スライドショーで使用） - 「操作方法」を含める
const ALL_IMAGES = [
    { src: 'images/操作方法.png', alt: '操作方法', isControl: true }, // ★操作方法
    { src: 'images/ツーショット①.jpg', alt: 'ツーショット①', isControl: false }, 
    { src: 'images/ツーショット②.jpg', alt: 'ツーショット②', isControl: false },
    { src: 'images/集合写真①.jpg', alt: '集合写真①', isControl: false },
    { src: 'images/集合写真②.jpg', alt: '集合写真②', isControl: false },
    { src: 'images/集合写真③.jpg', alt: '集合写真③', isControl: false },
    { src: 'images/集合写真④.jpg', alt: '集合写真④', isControl: false },
    { src: 'images/集合写真⑤.jpg', alt: '集合写真⑤', isControl: false },
    { src: 'images/集合写真⑥.jpg', alt: '集合写真⑥', isControl: false },
    { src: 'images/集合写真⑦.jpg', alt: '集合写真⑦', isControl: false },
    { src: 'images/門での写真①.jpg', alt: '門での写真①', isControl: false },
    { src: 'images/門での写真②.jpg', alt: '門での写真②', isControl: false },
    { src: 'images/門での写真③.jpg', alt: '門での写真③', isControl: false },
    { src: 'images/お別れ.jpg', alt: 'お別れ', isControl: false }
];

// 🖼️ グリッド表示用リスト - 「操作方法」を除外
const GRID_IMAGES = ALL_IMAGES.filter(img => !img.isControl);

// DOM要素の取得
const gridContainer = document.getElementById('grid-container');
const modal = document.getElementById('modal');
const modalImage = document.getElementById('modal-image');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const closeBtn = document.getElementById('close-btn');
const slideshowBtn = document.getElementById('slideshow-btn');
const audioPlayer = document.getElementById('audio-player');
const downloadBtn = document.getElementById('download-btn'); 

// 💌 メッセージフォーム関連の要素
const messageBtn = document.getElementById('message-btn');
const messageModal = document.getElementById('message-modal');
const messageCloseBtn = document.getElementById('message-close-btn');
const messageForm = document.getElementById('message-form');
const formStatus = document.getElementById('form-status');

// ★重要: GASの公開URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyT4xfqn1GC-GRdTDT1pMjXueaHmn-sG4luRegfGAWc4ZiZ_nMOI02nJlu0kgpygyGz/exec';

let currentImageIndex = 0;
let isSlideshowMode = false;
let autoAdvanceTimer = null; 
let slideInterval = null;    

const OPERATION_TIME_MS = 20000; // 20秒 (操作方法表示時間)
const SLIDESHOW_TIME_MS = 10000; // 10秒


// --- タイマーとインターバルの管理 ---

function clearSlideInterval() {
    if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
    }
}

function setSlideInterval() {
    clearSlideInterval();
    slideInterval = setInterval(() => {
        if (currentImageIndex < ALL_IMAGES.length - 1) {
            changeImage(1);
        } else {
            clearSlideInterval();
        }
    }, SLIDESHOW_TIME_MS);
}

function setOperationTimer() {
    clearOperationTimer();
    autoAdvanceTimer = setTimeout(() => {
        if (currentImageIndex === 0 && isSlideshowMode) {
            changeImage(1);
        }
    }, OPERATION_TIME_MS);
}

function clearOperationTimer() {
    if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
    }
}

function goToNextImageOnTap() {
    clearOperationTimer();
    changeImage(1);
}

// --- グリッド表示の生成 ---
function createGrid() {
    // 💡 GRID_IMAGES (操作方法を除いたリスト) を使用
    GRID_IMAGES.forEach((image, index) => {
        const item = document.createElement('div');
        item.classList.add('grid-item');
        item.dataset.index = index; 

        const img = document.createElement('img');
        img.src = image.src;
        img.alt = image.alt;

        item.appendChild(img);
        gridContainer.appendChild(item);

        setTimeout(() => {
            item.classList.add('loaded');
        }, index * 100); 
        
        // クリック時にALL_IMAGESの対応するインデックス (index + 1) を渡す
        item.addEventListener('click', () => openModal(index + 1, false)); 
    });
}

// --- モーダル（拡大表示）の表示と画像切り替え ---
function openModal(index, isSlideshow) {
    currentImageIndex = index;
    isSlideshowMode = isSlideshow;
    
    document.body.classList.toggle('slideshow-mode', isSlideshow);
    
    if (isSlideshow) {
        if (index === 0) {
            setOperationTimer(); 
            modalImage.addEventListener('click', goToNextImageOnTap, { once: true });
            clearSlideInterval();
            if (!audioPlayer.paused) { audioPlayer.pause(); } 
            forceLandscapeOrientation();
        } else {
            clearOperationTimer();
            modalImage.removeEventListener('click', goToNextImageOnTap);
            setSlideInterval(); 
            audioPlayer.play().catch(e => console.log("Audio play failed:", e));
        }

    } else {
        clearOperationTimer();
        clearSlideInterval();
    }
    
    updateModalImage();
    modal.style.display = 'flex';
}

function closeModal() {
    clearOperationTimer();
    clearSlideInterval(); 
    
    document.body.classList.remove('slideshow-mode');
    isSlideshowMode = false;
    modal.style.display = 'none';
    
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    
    releaseOrientationLock();
}

function updateModalImage() {
    // 💡 ALL_IMAGES を使用
    const newImage = ALL_IMAGES[currentImageIndex]; 
    
    modalImage.style.opacity = '0';
    
    setTimeout(() => {
        modalImage.src = newImage.src;
        modalImage.alt = newImage.alt;
        
        modalImage.style.opacity = '1';
        
        // ダウンロードボタンのリンクを更新
        downloadBtn.href = newImage.src;
        downloadBtn.download = newImage.src.split('/').pop();
        
    }, 400); 

    updateNavigationState();
}

function changeImage(step) {
    const newIndex = currentImageIndex + step;
    if (newIndex >= 0 && newIndex < ALL_IMAGES.length) { 
        
        // スライドショーの2枚目から1枚目（操作方法）へ戻るのを禁止
        if (isSlideshowMode && currentImageIndex === 1 && step === -1) {
            return; 
        }
        
        currentImageIndex = newIndex;
        updateModalImage();
        
        if (isSlideshowMode) {
            if (currentImageIndex === 0) {
                setOperationTimer(); 
                clearSlideInterval();
                modalImage.addEventListener('click', goToNextImageOnTap, { once: true });
                if (!audioPlayer.paused) { audioPlayer.pause(); }
            } else {
                clearOperationTimer();
                modalImage.removeEventListener('click', goToNextImageOnTap);
                setSlideInterval(); 
                audioPlayer.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    }
}

function updateNavigationState() {
    const isFirst = currentImageIndex === 0;
    const isLast = currentImageIndex === ALL_IMAGES.length - 1; 
    
    prevBtn.classList.toggle('disabled-btn', isFirst);
    nextBtn.classList.toggle('disabled-btn', isLast);
    
    modal.classList.toggle('first-image', isFirst);
    
    if (!isSlideshowMode) {
        // 個別拡大モードでは操作方法の画像は表示されないため、prevボタンを常に有効
        prevBtn.classList.remove('disabled-btn'); 
    }
}

// --- メッセージフォーム送信処理 (変更なし) ---
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(messageForm);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    const submitBtn = document.getElementById('submit-message-btn');
    submitBtn.textContent = '送信中...';
    submitBtn.disabled = true;
    formStatus.textContent = 'メッセージを送信しています...';

    // GASにデータを送信
    fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(data)
    })
    .then(() => {
        formStatus.textContent = '✅ 送信が完了しました！ありがとう！';
        messageForm.reset(); 
        
        setTimeout(() => {
            messageModal.style.display = 'none';
            formStatus.textContent = ''; 
        }, 5000);
    })
    .catch(error => {
        console.error('送信エラー:', error);
        formStatus.textContent = '❌ 送信に失敗しました...もう一度試してください。';
    })
    .finally(() => {
        submitBtn.textContent = '送信';
        submitBtn.disabled = false;
    });
}

// --- イベントリスナーの設定 (変更なし) ---

slideshowBtn.addEventListener('click', () => {
    openModal(0, true);
});

// 💌 メッセージボタンのイベント
messageBtn.addEventListener('click', () => {
    messageModal.style.display = 'flex';
});
messageCloseBtn.addEventListener('click', () => {
    messageModal.style.display = 'none';
});
messageModal.addEventListener('click', (e) => {
    if (e.target === messageModal) {
        messageModal.style.display = 'none';
    }
});
messageForm.addEventListener('submit', handleFormSubmit);

// 既存のモーダル操作イベント
prevBtn.addEventListener('click', () => changeImage(-1));
nextBtn.addEventListener('click', () => changeImage(1));
closeBtn.addEventListener('click', closeModal);

document.addEventListener('keydown', (e) => {
    if (modal.style.display === 'flex') {
        if (e.key === 'ArrowLeft') {
            e.preventDefault(); changeImage(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault(); changeImage(1);
        } else if (e.key === 'Escape') {
            closeModal();
        }
    }
});

modal.addEventListener('click', (e) => {
    if (isSlideshowMode) { 
        const rect = modal.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        if (clickX < width * 0.15) { changeImage(-1); } 
        else if (clickX > width * 0.85) { changeImage(1); }
    }
});

let touchStartX = 0;
modal.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { touchStartX = e.touches[0].clientX; }
});
modal.addEventListener('touchend', (e) => {
    if (e.changedTouches.length === 1) {
        const diff = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) { changeImage(-1); } 
            else { changeImage(1); }
        }
    }
});

// --- 画面の向き強制（スマホ/タブレット） ---

function forceLandscapeOrientation() {
    if (window.screen.orientation && (window.innerWidth < 1024 || window.innerHeight < 1024)) {
        try {
            window.screen.orientation.lock('landscape').catch(err => {
                console.log("Orientation lock failed:", err);
            });
        } catch (e) {
            console.log("Orientation lock not supported or failed:", e);
        }
    }
}

function releaseOrientationLock() {
    if (window.screen.orientation && (window.innerWidth < 1024 || window.innerHeight < 1024)) {
        try {
            window.screen.orientation.unlock();
        } catch (e) {
            console.log("Orientation unlock failed:", e);
        }
    }
}

// 最初の処理の実行
document.addEventListener('DOMContentLoaded', createGrid);