// 陀螺仪功能模块

let deviceOrientation = null;
let isMobileDevice = false;
let gyroEnabled = false;
let gyroBtn = null;

/**
 * 初始化设备方向（陀螺仪）
 */
function initDeviceOrientation() {
    console.log('初始化设备方向监听...');
    
    if (window.DeviceOrientationEvent && 'ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleOrientation);
        console.log('使用 deviceorientationabsolute 事件');
    } else if ('ondeviceorientation' in window) {
        window.addEventListener('deviceorientation', handleOrientation);
        console.log('使用 deviceorientation 事件');
    } else {
        console.log('设备方向 API 不可用');
        showToast('设备不支持陀螺仪功能', 'error');
        return;
    }
    
    checkGyroscopePermission();
}

/**
 * 检查陀螺仪权限
 */
function checkGyroscopePermission() {
    console.log('检查陀螺仪权限...');
    
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        console.log('需要请求陀螺仪权限');
        
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    console.log('陀螺仪权限已授予');
                    showToast('陀螺仪权限已授予', 'success');
                } else {
                    console.log('陀螺仪权限被拒绝');
                    showToast('陀螺仪权限被拒绝，请在设置中允许访问', 'error');
                }
            })
            .catch(error => {
                console.error('请求陀螺仪权限失败:', error);
                showToast('请求陀螺仪权限失败', 'error');
            });
    } else {
        console.log('不需要请求陀螺仪权限');
        showToast('陀螺仪已就绪', 'success');
    }
}

/**
 * 处理设备方向变化
 */
function handleOrientation(event) {
    if (!gyroEnabled) {
        return;
    }
    
    if (!event.alpha && !event.beta && !event.gamma) {
        return;
    }
    
    const alpha = event.alpha;
    const beta = event.beta;
    const gamma = event.gamma;
    
    deviceOrientation = {
        alpha: alpha,
        beta: beta,
        gamma: gamma
    };
    
    console.log('设备方向变化:', {
        alpha: alpha.toFixed(1) + '°',
        beta: beta.toFixed(1) + '°',
        gamma: gamma.toFixed(1) + '°'
    });
    
    updateAzimuthDisplay(alpha);
    
    if (window.lat1 && window.lng1) {
        updateLabelMeWithGyro(alpha, beta);
    }
    
    if (window.lat1 && window.lng1 && map) {
        rotateMapByOrientation();
    }
}

/**
 * 切换陀螺仪状态
 */
function toggleGyroscope() {
    gyroEnabled = !gyroEnabled;
    
    if (gyroBtn) {
        if (gyroEnabled) {
            gyroBtn.innerText = '关闭陀螺仪';
            gyroBtn.style.background = '#dc3545';
            showToast('陀螺仪已开启，地图将自动旋转', 'success');
            initDeviceOrientation();
        } else {
            gyroBtn.innerText = '开启陀螺仪';
            gyroBtn.style.background = '#007bff';
            showToast('陀螺仪已关闭', 'info');
            if (map) {
                map.setRotation(0);
            }
            updateAzimuthDisplay(0);
            if (window.lat1 && window.lng1) {
                updateLabelMeWithGyro(0, 0);
            }
        }
    }
}

/**
 * 更新方位角显示
 */
function updateAzimuthDisplay(azimuth) {
    const azimuthValue = document.getElementById('azimuthValue');
    if (azimuthValue) {
        const normalizedAzimuth = (azimuth % 360 + 360) % 360;
        azimuthValue.textContent = normalizedAzimuth.toFixed(1) + '°';
    }
}

/**
 * 根据陀螺仪数据更新炮位标签
 */
function updateLabelMeWithGyro(azimuth, pitch) {
    if (!window.lat1 || !window.lng1) return;
    
    const normalizedAzimuth = (azimuth % 360 + 360) % 360;
    
    let normalizedPitch = Math.abs(pitch);
    if (normalizedPitch > 90) {
        normalizedPitch = 180 - normalizedPitch;
    }
    
    const mortarType = document.getElementById('mortarType').value;
    const mortarTypeName = mortarType + 'mm';
    const chargeLevel = document.getElementById('chargeLevel').value;
    
    const labelText = '炮位 (' + mortarTypeName + ')\n装药：' + chargeLevel + '号\n' + window.lat1.toFixed(4) + ', ' + window.lng1.toFixed(4) + '\n方位:' + normalizedAzimuth.toFixed(1) + '° 仰角:' + normalizedPitch.toFixed(1) + '°';
    
    if (labelMe) {
        labelMe.setText(labelText);
    } else {
        labelMe = new AMap.Text({
            text: labelText,
            position: [window.lng1, window.lat1],
            offset: new AMap.Pixel(0, -60),
            style: {
                'background-color': '#0f0',
                'color': '#000',
                'padding': '4px 12px',
                'border-radius': '4px',
                'font-size': '11px',
                'border': '1px solid #000'
            }
        });
        map.add(labelMe);
    }
}

/**
 * 根据设备方向旋转地图
 */
function rotateMapByOrientation() {
    if (!deviceOrientation || !map) {
        return;
    }
    
    const rotation = deviceOrientation.alpha;
    
    if (rotation !== null && !isNaN(rotation)) {
        const mapRotation = rotation;
        map.setRotation(mapRotation);
        console.log('地图旋转角度:', mapRotation.toFixed(1) + '°');
    }
}
