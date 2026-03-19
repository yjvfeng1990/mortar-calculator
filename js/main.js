// 主逻辑模块

// 全局变量（通过 window 对象共享给其他模块）
window.lat1 = null;
window.lng1 = null;
window.lat2 = null;
window.lng2 = null;

// 页面加载完成后初始化
window.onload = function() {
    initMap();
    setTimeout(getMyPos, 1000);
    
    // 页面加载时自动开启陀螺仪
    setTimeout(() => {
        if (typeof toggleGyroscope === 'function') {
            toggleGyroscope();
        }
    }, 500);
};

/**
 * 获取炮位坐标
 */
function getMyPos() {
    if (!navigator.geolocation) {
        showToast('您的浏览器不支持定位功能，请手动输入坐标', 'error');
        return;
    }
    
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        showToast('定位功能需要 HTTPS 协议，请手动输入坐标', 'error');
        return;
    }
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let geoOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    };
    
    if (isIOS) {
        geoOptions.timeout = 20000;
        geoOptions.enableHighAccuracy = true;
    } else if (isAndroid) {
        geoOptions.timeout = 15000;
        geoOptions.maximumAge = 5000;
    } else {
        geoOptions.timeout = 10000;
    }
    
    showToast('正在获取位置...', 'info');
    
    navigator.geolocation.getCurrentPosition(pos => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        
        console.log('定位数据获取:', {
            lat: newLat,
            lng: newLng,
            accuracy: accuracy + 'm',
            device: isIOS ? 'iOS' : isAndroid ? 'Android' : 'PC',
            coord: 'WGS84'
        });
        
        wgs84ToGcj02(newLat, newLng, function(convertedCoords) {
            console.log('坐标转换:', {
                WGS84: { lat: newLat, lng: newLng },
                GCJ02: { lat: convertedCoords.lat, lng: convertedCoords.lng }
            });
            
            if (isNaN(convertedCoords.lat) || isNaN(convertedCoords.lng) || convertedCoords.lat === 0 || convertedCoords.lng === 0) {
                console.error('坐标验证失败:', { lat: convertedCoords.lat, lng: convertedCoords.lng });
                showToast('获取的坐标无效，请重试或手动输入', 'error');
                return;
            }
            
            window.lat1 = convertedCoords.lat;
            window.lng1 = convertedCoords.lng;
            
            console.log('坐标更新完成:', { lat: window.lat1, lng: window.lng1 });
            
            const lat1Element = document.getElementById('lat1');
            const lng1Element = document.getElementById('lng1');
            if (lat1Element) {
                lat1Element.innerText = window.lat1.toFixed(6);
            }
            if (lng1Element) {
                lng1Element.innerText = window.lng1.toFixed(6);
            }
            
            if (markerMe) {
                map.remove(markerMe);
                markerMe = null;
            }
            
            markerMe = new AMap.Marker({
                position: [window.lng1, window.lat1],
                title: "炮位",
                animation: 'AMAP_ANIMATION_DROP',
                zIndex: 100
            });
            map.add(markerMe);
            
            map.setFitView([markerMe], false, [50, 50, 50, 50], 16);
            
            showLabelMe();
            
            drawRangeCircle();
            
            if (map) {
                map.setCenter([window.lng1, window.lat1]);
            }
            
            if (window.lat2 && window.lng2) {
                calcAll();
            }
            
            showToast('定位成功', 'success');
            
        }, error => {
            console.error('定位失败:', error);
            let errorMessage = '定位失败';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = '定位权限被拒绝，请在设置中允许访问位置';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = '位置信息不可用';
                    break;
                case error.TIMEOUT:
                    errorMessage = '定位超时';
                    break;
                case error.UNKNOWN_ERROR:
                    errorMessage = '未知错误';
                    break;
            }
            showToast(errorMessage, 'error');
        }, geoOptions);
    }, error => {
        console.error('获取位置失败:', error);
        showToast('获取位置失败：' + error.message, 'error');
    });
}

/**
 * 计算所有射击参数
 */
function calcAll() {
    if (!window.lat1 || !window.lng1 || !window.lat2 || !window.lng2) {
        return;
    }
    
    const mortarType = document.getElementById('mortarType').value;
    const chargeLevel = document.getElementById('chargeLevel').value;
    
    const distance = calculateDistance(window.lat1, window.lng1, window.lat2, window.lng2);
    const azimuth = calculateAzimuth(window.lat1, window.lng1, window.lat2, window.lng2);
    const elevation = calculateElevation(distance, mortarType, chargeLevel);
    const flightTime = calculateFlightTime(distance, elevation);
    
    document.getElementById('dist').innerText = Math.round(distance) + 'm';
    
    // 对比方位角
    let azText = azimuth.toFixed(1) + '°';
    
    // 对比仰角
    let elText = '';
    
    // 只有当陀螺仪启用且有数据时才显示对比状态
    if (typeof gyroEnabled !== 'undefined' && gyroEnabled) {
        // 获取实时方位角和仰角
        const azimuthValue = document.getElementById('azimuthValue');
        const pitchValue = document.getElementById('pitchValue');
        const realTimeAzimuth = azimuthValue ? parseFloat(azimuthValue.textContent) : 0;
        const realTimePitch = pitchValue ? parseFloat(pitchValue.textContent) : 0;
        
        // 对比方位角
        if (elevation !== -1 && elevation !== -2) {
            // 计算方位角差值（考虑360度循环）
            let azDiff = Math.abs(azimuth - realTimeAzimuth);
            if (azDiff > 180) {
                azDiff = 360 - azDiff;
            }
            
            if (azDiff < 1) {
                azText += ' ✓';
            } else {
                // 确定方向（考虑360度循环）
                const clockwiseDiff = (realTimeAzimuth - azimuth + 360) % 360;
                const counterClockwiseDiff = (azimuth - realTimeAzimuth + 360) % 360;
                
                if (clockwiseDiff < counterClockwiseDiff) {
                    azText += ' ←'; // 逆时针调整
                } else {
                    azText += ' →'; // 顺时针调整
                }
            }
        }
        
        // 对比方位角
        document.getElementById('az').innerText = azText;
        
        // 对比仰角
        if (elevation === -1) {
            document.getElementById('el').innerText = '未设置';
            elText = '未设置';
        } else if (elevation === -2) {
            document.getElementById('el').innerText = '超射程';
            elText = '超射程';
        } else {
            elText = elevation.toFixed(1) + '°';
            const elDiff = Math.abs(elevation - realTimePitch);
            if (elDiff < 1) {
                elText += ' ✓';
            } else if (elevation > realTimePitch) {
                elText += ' ↑';
            } else {
                elText += ' ↓';
            }
            document.getElementById('el').innerText = elText;
        }
    } else {
        // 没有陀螺仪数据，保持基本显示
        document.getElementById('az').innerText = azText;
        if (elevation === -1) {
            document.getElementById('el').innerText = '未设置';
            elText = '未设置';
        } else if (elevation === -2) {
            document.getElementById('el').innerText = '超射程';
            elText = '超射程';
        } else {
            elText = elevation.toFixed(1) + '°';
            document.getElementById('el').innerText = elText;
        }
    }
    
    updateLabelMe(azText, elText);
    
    drawLine();
    
    console.log('射击参数计算完成:', {
        distance: distance.toFixed(1) + 'm',
        azimuth: azimuth.toFixed(1) + '°',
        elevation: elevation.toFixed(1) + '°',
        flightTime: flightTime.toFixed(1) + 's'
    });
}

/**
 * 更新炮位标签，显示方位角和仰角
 */
function updateLabelMe(azText, elText) {
    if (!window.lat1 || !window.lng1) return;
    
    const mortarType = document.getElementById('mortarType').value;
    const mortarTypeName = mortarType + 'mm';
    const chargeLevel = document.getElementById('chargeLevel').value;
    
    const labelText = '炮位 (' + mortarTypeName + ')\n装药：' + chargeLevel + '号\n' + window.lat1.toFixed(4) + ', ' + window.lng1.toFixed(4) + '\n方位:' + azText + ' 仰角:' + elText;
    
    if (labelMe) {
        labelMe.setText(labelText);
    }
}

/**
 * 绘制炮位和目标点之间的连线
 */
function drawLine() {
    if (!window.lat1 || !window.lng1 || !window.lat2 || !window.lng2) return;
    
    if (polyline) map.remove(polyline);
    if (distanceLabel) map.remove(distanceLabel);
    if (labelTarget) map.remove(labelTarget);
    
    polyline = new AMap.Polyline({
        path: [[window.lng1, window.lat1], [window.lng2, window.lat2]],
        strokeColor: "#06f",
        strokeWeight: 3,
        strokeOpacity: 0.8
    });
    
    map.add(polyline);
    
    const distance = calculateDistance(window.lat1, window.lng1, window.lat2, window.lng2);
    const azimuth = calculateAzimuth(window.lat1, window.lng1, window.lat2, window.lng2);
    const elevation = calculateElevation(distance, document.getElementById('mortarType').value, document.getElementById('chargeLevel').value);
    const flightTime = calculateFlightTime(distance, elevation);
    
    let labelText = '目标\n' + window.lat2.toFixed(4) + ', ' + window.lng2.toFixed(4);
    if (elevation !== -1 && elevation !== -2) {
        labelText += '\n方位角:' + azimuth.toFixed(1) + '°\n仰角:' + elevation.toFixed(1) + '°';
    } else if (elevation === -1) {
        labelText += '\n仰角:未设置';
    } else if (elevation === -2) {
        labelText += '\n仰角:超射程';
    }
    labelText += '\n飞行时间:' + flightTime.toFixed(1) + 's';
    
    labelTarget = new AMap.Text({
        text: labelText,
        position: [window.lng2, window.lat2],
        offset: new AMap.Pixel(0, -60),
        style: {
            'background-color': '#f00',
            'color': '#fff',
            'padding': '4px 12px',
            'border-radius': '4px',
            'font-size': '11px',
            'border': '1px solid #fff',
            'white-space': 'pre-line'
        }
    });
    
    map.add(labelTarget);
    
    const distance = calculateDistance(window.lat1, window.lng1, window.lat2, window.lng2);
    const midLng = (window.lng1 + window.lng2) / 2;
    const midLat = (window.lat1 + window.lat2) / 2;
    
    distanceLabel = new AMap.Text({
        text: Math.round(distance) + 'm',
        position: [midLng, midLat],
        offset: new AMap.Pixel(0, -30),
        style: {
            'background-color': '#06f',
            'color': '#fff',
            'padding': '4px 8px',
            'border-radius': '4px',
            'font-size': '12px',
            'border': '1px solid #fff'
        }
    });
    
    map.add(distanceLabel);
}

// 参数改变重算
document.addEventListener('DOMContentLoaded', function() {
    const mortarTypeSelect = document.getElementById('mortarType');
    const chargeLevelSelect = document.getElementById('chargeLevel');
    
    if (mortarTypeSelect) {
        mortarTypeSelect.onchange = function() {
            calcAll();
            drawRangeCircle();
        };
    }
    
    if (chargeLevelSelect) {
        chargeLevelSelect.onchange = function() {
            calcAll();
            drawRangeCircle();
        };
    }
});
