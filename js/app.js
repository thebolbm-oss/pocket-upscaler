const imageInput = document.getElementById('imageInput');
const preview = document.getElementById('preview');
const statusText = document.getElementById('status');
const modelSelect = document.getElementById('modelSelect');

let session = null;

// Photo select karne par preview dikhana
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            preview.src = event.target.result;
            preview.style.display = 'block';
            statusText.innerText = "Image loaded. Ready to enhance!";
        };
        reader.readAsDataURL(file);
    }
});

// Model load karna direct internet se! (Download karne ki jhanjhat khatam)
async function loadModel(type) {
    statusText.innerText = "Fetching AI Model from Cloud... Please wait.";
    
    // Yahan hum direct un repositories ka link de rahe hain jahan models rakhe hain
    const modelUrl = type === 'fast' 
        ? 'https://raw.githubusercontent.com/onnx/models/main/vision/super_resolution/sub_pixel_cnn_2016/model/super-resolution-10.onnx' 
        : 'https://huggingface.co/spaces/Xenova/real-esrgan-web/resolve/main/models/realesrgan-x4.onnx';

    try {
        // ONNX Runtime seedha URL se model fetch karega
        session = await ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
        statusText.innerText = "Model loaded successfully! Starting enhancement...";
        return true;
    } catch (error) {
        console.error("Error loading model:", error);
        statusText.innerText = "Error: Could not load the model. Check console.";
        return false;
    }
}

// Enhance button ka function
async function processImage() {
    if (!imageInput.files[0]) {
        alert("Bhai, ek image toh select kar lo!");
        return;
    }

    const modelType = modelSelect.value;
    const isModelLoaded = await loadModel(modelType);

    if (!isModelLoaded) return;

    statusText.innerText = "Processing... Phone is working hard ⚡";

    // Tensor math implementation baaki hai
    setTimeout(() => {
        statusText.innerText = "Enhancement complete! (Tensor code pending)";
    }, 2000);
}
// --- YAHAN SE NAYA CODE SHURU HAI ---

// 1. Photo ko Tensor (Numbers) mein convert karna
function imageToTensor(imageElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Resize for phone memory safety (keeping it small for now)
    const width = imageElement.naturalWidth;
    const height = imageElement.naturalHeight;
    canvas.width = width;
    canvas.height = height;
    
    ctx.drawImage(imageElement, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height).data;
    
    // R, G, B channels ko alag-alag array mein daalna (CHW format)
    const float32Data = new Float32Array(3 * width * height);
    for (let i = 0; i < width * height; i++) {
        float32Data[i] = imageData[i * 4] / 255.0; // Red
        float32Data[i + width * height] = imageData[i * 4 + 1] / 255.0; // Green
        float32Data[i + 2 * width * height] = imageData[i * 4 + 2] / 255.0; // Blue
    }
    
    // ONNX Tensor banana [Batch, Channels, Height, Width]
    return new ort.Tensor('float32', float32Data, [1, 3, height, width]);
}

// 2. AI se aaye numbers ko wapas Photo mein convert karna
function tensorToImage(tensor, canvasId) {
    const data = tensor.data;
    const width = tensor.dims[3];
    const height = tensor.dims[2];
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    
    for (let i = 0; i < width * height; i++) {
        imageData.data[i * 4] = Math.max(0, Math.min(255, data[i] * 255)); // Red
        imageData.data[i * 4 + 1] = Math.max(0, Math.min(255, data[i + width * height] * 255)); // Green
        imageData.data[i * 4 + 2] = Math.max(0, Math.min(255, data[i + 2 * width * height] * 255)); // Blue
        imageData.data[i * 4 + 3] = 255; // Alpha (Opacity)
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
}

// 3. Puraana processImage function hata kar ye NAYA wala daalein
async function processImage() {
    if (!imageInput.files[0]) {
        alert("Bhai, ek image toh select kar lo!");
        return;
    }

    const modelType = modelSelect.value;
    const isModelLoaded = await loadModel(modelType);

    if (!isModelLoaded) return;

    statusText.style.color = "#ffcc00";
    statusText.innerText = "Processing... Phone is working hard ⚡";

    try {
        // Image ko Tensor mein badlo
        const inputTensor = imageToTensor(preview);
        
        // Model ke hisaab se input ka naam (HuggingFace/ONNX standard)
        const inputName = session.inputNames[0];
        const feeds = {};
        feeds[inputName] = inputTensor;
        
        // AI Model ko run karna (Yeh step time lega)
        const results = await session.run(feeds);
        
        // Output nikalna
        const outputName = session.outputNames[0];
        const outputTensor = results[outputName];
        
        // Output Tensor ko wapas Photo banakar screen par dikhana
        const enhancedImageUrl = tensorToImage(outputTensor);
        preview.src = enhancedImageUrl;
        
        statusText.style.color = "#00ff00";
        statusText.innerText = "Enhancement Complete! 🎉";
        
    } catch (error) {
        console.error("Tensor Error:", error);
        statusText.style.color = "#ff3333";
        statusText.innerText = "Error during processing. Photo size might be too big for phone memory.";
    }
}
