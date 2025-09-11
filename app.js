
const sourceCanvas = document.getElementById('sourceCanvas');
const displayCanvas = document.getElementById('displayCanvas');
const ctx = displayCanvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const startBtn = document.getElementById('startBtn');
const pixelSizeInput = document.getElementById('pixelSize');
const scaleFactorSelect = document.getElementById('scaleFactor');
const pixelTypeSelect = document.getElementById('pixelType');
const drawModeSelect = document.getElementById('drawMode');
// 修改: 将 customCharInput 改为 textarea 以支持输入一段话
const customCharInput = document.getElementById('customChar');
// 添加保存按钮引用
const saveBtn = document.getElementById('saveBtn');

// 添加保存事件监听
saveBtn.addEventListener('click', saveImage);

let imageData = null;
let animationFrameId = null;
let currentStep = 0;
let isGenerationComplete = false;

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
