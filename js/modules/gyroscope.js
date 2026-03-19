// 陀螺仪功能模块

let deviceOrientation = null;
let gyroEnabled = false;
let gyroBtn = null;
let gyroCalibrationOffset = 0; // 陀螺仪校准偏移量

// 暴露给全局作用域
window.gyroEnabled = gyroEnabled;

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
    
    if (event.alpha === null && event.beta === null && event.gamma === null) {
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
    
    // 修正陀螺仪数据方向：陀螺仪alpha值是逆时针增加，需要转换为顺时针增加以符合指南针标准
    // 应用校准偏移量，确保初始值符合指南针标准
    const correctedAzimuth = (360 - alpha + gyroCalibrationOffset) % 360;
    const normalizedAzimuth = (correctedAzimuth % 360 + 360) % 360;
    
    updateAzimuthDisplay(normalizedAzimuth, beta);
    
    if (window.lat1 && window.lng1) {
        updateLabelMeWithGyro(normalizedAzimuth, beta);
    }
    
    if (window.lat1 && window.lng1 && map) {
        rotateMapByOrientation(normalizedAzimuth);
        // 更新方位指针
        if (typeof updateAzimuthPointer === 'function') {
            updateAzimuthPointer(normalizedAzimuth);
        }
    }
}

/**
 * 重置陀螺仪校准
 */
function resetGyroCalibration() {
    gyroCalibrationOffset = 0;
    console.log('陀螺仪校准已重置');
    showToast('陀螺仪校准已重置', 'info');
}

/**
 * 切换陀螺仪状态
 */
function toggleGyroscope() {
    gyroEnabled = !gyroEnabled;
    window.gyroEnabled = gyroEnabled; // 更新全局变量
    
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
            updateAzimuthDisplay(0, 0);
            if (window.lat1 && window.lng1) {
                updateLabelMeWithGyro(0, 0);
                // 关闭陀螺仪时移除方位指针
                if (typeof updateAzimuthPointer === 'function') {
                    updateAzimuthPointer(0);
                }
            }
        }
    }
}

/**
 * 更新方位角显示
 */
function updateAzimuthDisplay(azimuth, pitch) {
    // 直接使用传入的已经修正和归一化的方位角数据
    
    // 更新射击参数区域的实时数据
    const azRealTime = document.getElementById('azRealTime');
    if (azRealTime) {
        if (gyroEnabled) {
            azRealTime.textContent = azimuth.toFixed(1) + '°';
        } else {
            azRealTime.textContent = '--';
        }
    }
    
    const elRealTime = document.getElementById('elRealTime');
    if (elRealTime) {
        if (gyroEnabled) {
            let normalizedPitch = Math.abs(pitch);
            if (normalizedPitch > 90) {
                normalizedPitch = 180 - normalizedPitch;
            }
            elRealTime.textContent = normalizedPitch.toFixed(1) + '°';
        } else {
            elRealTime.textContent = '--';
        }
    }
}

/**
 * 根据陀螺仪数据更新炮位标签
 */
function updateLabelMeWithGyro(azimuth, pitch) {
    if (!window.lat1 || !window.lng1) return;
    
    // 直接使用传入的已经修正和归一化的方位角数据
    const normalizedAzimuth = azimuth;
    
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
function rotateMapByOrientation(normalizedAzimuth) {
    if (!map) {
        return;
    }
    
    if (normalizedAzimuth !== null && !isNaN(normalizedAzimuth)) {
        // 直接使用传入的已经修正和归一化的方位角数据
        map.setRotation(normalizedAzimuth);
        console.log('地图旋转角度:', normalizedAzimuth.toFixed(1) + '°');
    }
}
