const sourceCanvas = document.getElementById('sourceCanvas');
const displayCanvas = document.getElementById('displayCanvas');
const ctx = displayCanvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const videoInput = document.getElementById('videoInput');
const startBtn = document.getElementById('startBtn');
const startVideoBtn = document.getElementById('startVideoBtn');
const pixelSizeInput = document.getElementById('pixelSize');
const scaleFactorSelect = document.getElementById('scaleFactor');
const pixelTypeSelect = document.getElementById('pixelType');
const drawModeSelect = document.getElementById('drawMode');
// 修改: 将 customCharInput 改为 textarea 以支持输入一段话
const customCharInput = document.getElementById('customChar');
// 添加保存按钮引用
const saveBtn = document.getElementById('saveBtn');
const saveVideoBtn = document.getElementById('saveVideoBtn');

// 添加保存事件监听
saveBtn.addEventListener('click', saveImage);
saveVideoBtn.addEventListener('click', saveVideo);

let imageData = null;
let animationFrameId = null;
let currentStep = 0;
let isGenerationComplete = false;
// 视频相关变量
let sourceVideo = document.getElementById('sourceVideo');
let videoStream = null;
let videoProcessing = false;
let videoAnimationFrameId = null;
// 视频录制相关变量
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordedMimeType = 'video/webm'; // 默认MIME类型

// 初始化画布尺寸
function initCanvasSize(img) {
  const scaleFactor = scaleFactorSelect.value;

  // 根据倍数调整图像尺寸
  const targetWidth = Math.trunc(img.width * scaleFactor);
  const targetHeight = Math.trunc(img.height * scaleFactor);

  sourceCanvas.width = displayCanvas.width = targetWidth;
  sourceCanvas.height = displayCanvas.height = targetHeight;

  // 绘绘原始图片到源画布
  const sourceCtx = sourceCanvas.getContext('2d');
  // 清除旧图像并绘制调整后的图像
  sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  sourceCtx.drawImage(img, 0, 0, sourceCanvas.width, sourceCanvas.height);
  // 更新图像数据
  imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

  // 获取像素数据
  imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
}

// 初始化视频画布尺寸
function initVideoCanvasSize() {
  const scaleFactor = scaleFactorSelect.value;
  
  // 根据倍数调整视频尺寸
  const targetWidth = Math.trunc(sourceVideo.videoWidth * scaleFactor);
  const targetHeight = Math.trunc(sourceVideo.videoHeight * scaleFactor);

  sourceCanvas.width = displayCanvas.width = targetWidth;
  sourceCanvas.height = displayCanvas.height = targetHeight;
}

// 像素绘制动画
function drawPixelAnimation() {
  const pixelSize = parseInt(pixelSizeInput.value);
  const pixelType = pixelTypeSelect.value;
  const totalSteps = Math.ceil(displayCanvas.width / pixelSize) * Math.ceil(displayCanvas.height / pixelSize);

  if (currentStep >= totalSteps) {
    cancelAnimationFrame(animationFrameId);
    startBtn.disabled = false;
    isGenerationComplete = true;
    return;
  }

  const cols = Math.ceil(displayCanvas.width / pixelSize);
  const x = (currentStep % cols) * pixelSize;
  const y = Math.floor(currentStep / cols) * pixelSize;

  // 根据选择的样式绘制像素
  const color = getPixelColor(x, y, pixelSize);
  drawPixel(x, y, pixelSize, pixelType, color);

  currentStep++;
  animationFrameId = requestAnimationFrame(drawPixelAnimation);
}

// 视频像素化处理
function processVideoFrame() {
  if (sourceVideo.paused || sourceVideo.ended) {
    videoProcessing = false;
    startVideoBtn.disabled = false;
    startVideoBtn.textContent = '处理视频';
    // 停止录制
    if (isRecording) {
      stopRecording();
    }
    return;
  }

  // 将当前视频帧绘制到源画布上
  const sourceCtx = sourceCanvas.getContext('2d');
  sourceCtx.drawImage(sourceVideo, 0, 0, sourceCanvas.width, sourceCanvas.height);
  
  // 获取图像数据
  imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  
  // 像素化处理
  const pixelSize = parseInt(pixelSizeInput.value);
  const pixelType = pixelTypeSelect.value;
  const cols = Math.ceil(displayCanvas.width / pixelSize);
  const rows = Math.ceil(displayCanvas.height / pixelSize);
  
  // 清除显示画布
  ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
  
  // 绘制像素化帧
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * pixelSize;
      const y = row * pixelSize;
      const color = getPixelColor(x, y, pixelSize);
      drawPixel(x, y, pixelSize, pixelType, color);
    }
  }
  
  // 继续处理下一帧
  videoAnimationFrameId = requestAnimationFrame(processVideoFrame);
}

// 添加直接生成功能
function drawAllPixels() {
  const pixelSize = parseInt(pixelSizeInput.value);
  const pixelType = pixelTypeSelect.value;
  const cols = Math.ceil(displayCanvas.width / pixelSize);
  const rows = Math.ceil(displayCanvas.height / pixelSize);

  // 清除画布
  ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);

  // 直接绘制所有像素
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * pixelSize;
      const y = row * pixelSize;
      const color = getPixelColor(x, y, pixelSize);
      drawPixel(x, y, pixelSize, pixelType, color);
    }
  }

  startBtn.disabled = false;
  isGenerationComplete = true;
}

// 根据样式绘制像素
function drawPixel(x, y, size, type, color) {
  ctx.fillStyle = color;

  switch (type) {
    case 'square':
      ctx.fillRect(x, y, size, size);
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'char':
    case 'symbol':
      // 修改: 支持从输入的一段话中依次取字符绘制
      let char;
      if (type === 'char') {
        const customText = customCharInput.value || 'A';
        // 计算字符索引以循环使用输入的文本
        const index = Math.floor(y / size) * Math.ceil(displayCanvas.width / size) + Math.floor(x / size);
        char = customText[index % customText.length];
      } else {
        char = '♠';
      }
      ctx.font = `${size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, x + size / 2, y + size / 2);
      break;
  }
}

// 获取指定位置像素颜色
function getPixelColor(x, y, size) {
  const data = imageData.data;
  const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
  return `rgb(${data[index]}, ${data[index + 1]}, ${data[index + 2]})`;
}

// 事件监听
imageInput.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  // 隐藏视频处理按钮，显示图片处理按钮
  startVideoBtn.style.display = 'none';
  saveVideoBtn.style.display = 'none';
  startBtn.style.display = 'inline-block';
  saveBtn.style.display = 'inline-block';
  
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      initCanvasSize(img);
      ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
      currentStep = 0;
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

videoInput.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  // 显示视频处理按钮，隐藏图片处理按钮
  startBtn.style.display = 'none';
  saveBtn.style.display = 'none';
  startVideoBtn.style.display = 'inline-block';
  saveVideoBtn.style.display = 'inline-block';
  
  // 为视频元素设置源
  const url = URL.createObjectURL(file);
  sourceVideo.src = url;
  
  sourceVideo.onloadedmetadata = function() {
    initVideoCanvasSize();
    ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    currentStep = 0;
  };
});

startBtn.addEventListener('click', function () {
  // if (!imageData || !isGenerationComplete) {
  //   alert('请先选择图片');
  //   return;
  // }

  startBtn.disabled = true;
  currentStep = 0;
  ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);

  // 根据选择的模式决定使用动画还是直接生成
  if (drawModeSelect && drawModeSelect.value === 'animation') {
    isGenerationComplete = false;
    animationFrameId = requestAnimationFrame(drawPixelAnimation);
  } else if (drawModeSelect) {
    drawAllPixels();
  }
});

// 视频处理按钮事件
startVideoBtn.addEventListener('click', function () {
  if (videoProcessing) {
    // 停止处理
    videoProcessing = false;
    if (videoAnimationFrameId) {
      cancelAnimationFrame(videoAnimationFrameId);
    }
    sourceVideo.pause();
    startVideoBtn.textContent = '处理视频';
    startVideoBtn.disabled = false;
    // 停止录制
    if (isRecording) {
      stopRecording();
    }
  } else {
    // 开始处理
    videoProcessing = true;
    startVideoBtn.textContent = '停止处理';
    sourceVideo.play();
    // 自动开始录制
    startRecording();
    processVideoFrame();
  }
});

// 开始录制
function startRecording() {
  // 重置录制数据
  recordedChunks = [];
  
  // 创建媒体录制器
  const stream = displayCanvas.captureStream(30); // 30 FPS
  
  // 尝试不同的MIME类型，优先选择兼容性更好的格式
  const mimeTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4;codecs=vp9',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm'
  ];
  
  let selectedMimeType = mimeTypes[0];
  recordedMimeType = selectedMimeType;
  
  // 查找支持的MIME类型
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      selectedMimeType = mimeType;
      recordedMimeType = mimeType;
      break;
    }
  }
  
  try {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType
    });
  } catch (e) {
    // 如果指定MIME类型失败，使用默认配置
    mediaRecorder = new MediaRecorder(stream);
    recordedMimeType = mediaRecorder.mimeType;
  }

  mediaRecorder.ondataavailable = function(event) {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = function() {
    saveVideoBtn.disabled = false;
  };

  mediaRecorder.start();
  isRecording = true;
  saveVideoBtn.disabled = true;
}

// 停止录制
function stopRecording() {
  if (isRecording && mediaRecorder) {
    mediaRecorder.stop();
    isRecording = false;
  }
}

// 控件变化事件
pixelSizeInput.addEventListener('change', resetDrawing);
scaleFactorSelect.addEventListener('change', function () {
  if (imageInput.files[0]) {
    // 重新加载当前图片应用新缩放比例
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        initCanvasSize(img);
        resetDrawing();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(imageInput.files[0]);
  } else if (sourceVideo.src && !sourceVideo.paused) {
    // 重新设置视频画布尺寸
    initVideoCanvasSize();
    resetDrawing();
  } else if (drawModeSelect) {
    startBtn.disabled = true;
    resetDrawing();
  }
});
pixelTypeSelect.addEventListener('change', function () {
  customCharInput.style.display = this.value === 'char' ? 'inline-block' : 'none';
  resetDrawing();
});

// 添加绘制模式变化事件
drawModeSelect.addEventListener('change', resetDrawing);

function resetDrawing() {
  currentStep = 0;
  ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    startBtn.disabled = false;
  }
}

// 保存图像功能
function saveImage() {
  if (!imageData) {
    alert('请先生成图像');
    return;
  }

  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.download = `pixel-art-${timestamp}.png`;
  link.href = displayCanvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 保存视频功能
function saveVideo() {
  if (recordedChunks.length === 0) {
    alert('没有录制的视频可供保存');
    return;
  }

  const blob = new Blob(recordedChunks, { type: recordedMimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // 根据MIME类型确定文件扩展名
  let extension = 'webm'; // 默认扩展名
  if (recordedMimeType.includes('mp4')) {
    extension = 'mp4';
  } else if (recordedMimeType.includes('webm')) {
    extension = 'webm';
  }
  
  link.download = `pixel-video-${timestamp}.${extension}`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}