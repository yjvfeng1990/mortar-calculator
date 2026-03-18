// 核心逻辑模块

// 全局变量
let lat1 = null, lng1 = null; // 炮位坐标
let lat2 = null, lng2 = null; // 目标坐标
let toastTimeout = null; // 气泡通知定时器

// 模块实例
let mapManager = null;
let gyroscope = null;

// 页面加载完成后初始化
window.onload = function() {
    initApp();
};

/**
 * 初始化应用
 */
async function initApp() {
    try {
        // 初始化地图
        mapManager = new MapManager();
        await mapManager.init();
        
        // 初始化陀螺仪
        gyroscope = new Gyroscope();
        gyroscope.init(mapManager.getMap());
        
        // 显示地图加载成功的气泡通知
        showToast('地图加载成功！', 'success');
        
        // 点地图事件
        mapManager.getMap().on('click', e => {
            lat2 = e.lnglat.getLat();
            lng2 = e.lnglat.getLng();

            document.getElementById('lat2').innerText = lat2.toFixed(6);
            document.getElementById('lng2').innerText = lng2.toFixed(6);

            // 绘制目标点
            mapManager.drawMarkerTarget(lng2, lat2);

            // 如果炮位已设置，自动调整视角显示两个点
            if (lat1 && lng1) {
                mapManager.fitBounds(lng1, lat1, lng2, lat2);
                // 计算并显示数据
                calculateAndDisplayData();
            }
        });
        
        // 自动请求炮位坐标
        getMyPos();
        
    } catch (error) {
        console.error('应用初始化失败:', error);
        showToast('应用初始化失败', 'error');
    }
}

/**
 * 获取炮位坐标
 */
function getMyPos() {
    if (navigator.geolocation) {
        // 检测设备类型，设置不同的定位参数
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };
        
        // 移动设备使用更适合的定位参数
        if (isMobile) {
            options.enableHighAccuracy = true;
            options.timeout = 10000;
        }
        
        navigator.geolocation.getCurrentPosition(
            position => {
                lat1 = position.coords.latitude;
                lng1 = position.coords.longitude;
                
                console.log('定位成功，原始坐标:', {
                    latitude: lat1,
                    longitude: lng1,
                    accuracy: position.coords.accuracy
                });
                
                // 转换坐标（WGS84 -> GCJ02）
                const gcjCoords = wgs84togcj02(lng1, lat1);
                lng1 = gcjCoords.lng;
                lat1 = gcjCoords.lat;
                
                console.log('转换后坐标 (GCJ02):', {
                    latitude: lat1,
                    longitude: lng1
                });
                
                document.getElementById('lat1').innerText = lat1.toFixed(6);
                document.getElementById('lng1').innerText = lng1.toFixed(6);
                
                // 绘制炮位点
                mapManager.drawMarkerMe(lng1, lat1);
                
                // 显示炮位坐标标签
                const mortarType = document.getElementById('mortarType').value;
                const mortarTypeName = mortarType + 'mm';
                const chargeLevel = document.getElementById('chargeLevel').value;
                mapManager.showLabelMe(lng1, lat1, mortarTypeName, chargeLevel);
                
                // 绘制最大射程圆形
                mapManager.drawRangeCircle(lng1, lat1, mortarType, chargeLevel);
                
                // 地图回到炮位坐标显示，确保使用最新坐标
                mapManager.setCenter(lng1, lat1, 16);
                
                // 更新陀螺仪的炮位坐标
                gyroscope.updatePosition(lat1, lng1);
                gyroscope.updateLabel(mapManager.getLabelMe());
                
                // 显示气泡通知
                showToast('定位成功！地图已回到炮位位置', 'success');
                
            },
            error => {
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
            },
            options
        );
    } else {
        showToast('浏览器不支持地理定位', 'error');
    }
}

/**
 * 手动设置炮位坐标
 */
function setMyPos() {
    const inputLat = parseFloat(document.getElementById('inputLat').value);
    const inputLng = parseFloat(document.getElementById('inputLng').value);
    
    if (isNaN(inputLat) || isNaN(inputLng)) {
        showToast('请输入有效的坐标', 'error');
        return;
    }
    
    lat1 = inputLat;
    lng1 = inputLng;
    
    document.getElementById('lat1').innerText = lat1.toFixed(6);
    document.getElementById('lng1').innerText = lng1.toFixed(6);
    
    // 绘制炮位点
    mapManager.drawMarkerMe(lng1, lat1);
    
    // 显示炮位坐标标签
    const mortarType = document.getElementById('mortarType').value;
    const mortarTypeName = mortarType + 'mm';
    const chargeLevel = document.getElementById('chargeLevel').value;
    mapManager.showLabelMe(lng1, lat1, mortarTypeName, chargeLevel);
    
    // 绘制最大射程圆形
    mapManager.drawRangeCircle(lng1, lat1, mortarType, chargeLevel);
    
    // 地图回到炮位坐标显示
    mapManager.setCenter(lng1, lat1, 16);
    
    // 更新陀螺仪的炮位坐标
    gyroscope.updatePosition(lat1, lng1);
    gyroscope.updateLabel(mapManager.getLabelMe());
    
    // 如果目标点已设置，重新计算并绘制连线
    if (lat2 && lng2) {
        calculateAndDisplayData();
    }
    
    // 显示气泡通知
    showToast('手动坐标设置成功！地图已回到炮位位置', 'success');
}

/**
 * 计算并显示数据
 */
function calculateAndDisplayData() {
    if (!lat1 || !lng1 || !lat2 || !lng2) return;
    
    // 获取当前迫击炮型号和装药级别
    const mortarType = document.getElementById('mortarType').value;
    const chargeLevel = document.getElementById('chargeLevel').value;
    
    // 计算距离
    const distance = calculator.calculateDistance(lat1, lng1, lat2, lat2);
    document.getElementById('distance').innerText = distance.toFixed(1) + '米';
    
    // 计算方位角
    const az = calculator.calculateAzimuth(lat1, lng1, lat2, lat2);
    let azText = '';
    if (az >= 0 && az < 90) {
        document.getElementById('az').innerText = az.toFixed(2) + '° (东北)';
        azText = az.toFixed(2) + '°';
    } else if (az >= 90 && az < 180) {
        document.getElementById('az').innerText = az.toFixed(2) + '° (东南)';
        azText = az.toFixed(2) + '°';
    } else if (az >= 180 && az < 270) {
        document.getElementById('az').innerText = az.toFixed(2) + '° (西南)';
        azText = az.toFixed(2) + '°';
    } else {
        document.getElementById('az').innerText = az.toFixed(2) + '° (西北)';
        azText = az.toFixed(2) + '°';
    }
    
    // 计算仰角
    const el = calculator.calculateElevation(distance, mortarType, chargeLevel);
    let elText = '';
    if (el < 0) {
        document.getElementById('el').innerText = '0.00°';
        elText = '0.00°';
    } else {
        document.getElementById('el').innerText = el.toFixed(2) + '°';
        elText = el.toFixed(2) + '°';
    }
    
    // 更新炮位标签，显示方位角和仰角
    const mortarTypeName = mortarType + 'mm';
    mapManager.showLabelMe(lng1, lat1, mortarTypeName, chargeLevel, azText, elText);
    
    // 绘制炮位和目标点之间的连线
    mapManager.drawLine(lng1, lat1, lng2, lat2);
    
    // 计算弹道轨迹
    const trajectoryPoints = calculator.calculateTrajectory(distance, el);
    
    // 绘制弹道轨迹
    mapManager.drawTrajectory(lng1, lat1, lng2, lat2, trajectoryPoints);
    
    // 计算炮弹落地时间
    const flightTime = calculator.calculateFlightTime(distance, el);
    
    // 显示目标坐标标签
    mapManager.showLabelTarget(lng2, lat2, distance.toFixed(1), azText, elText, flightTime.toFixed(1));
    
    // 显示距离标签
    const centerLng = (lng1 + lng2) / 2;
    const centerLat = (lat1 + lat2) / 2;
}

/**
 * 切换地图类型
 */
function toggleMapType() {
    mapManager.toggleMapType();
}

/**
 * 切换陀螺仪状态
 */
function toggleGyroscope() {
    gyroscope.toggle();
}

/**
 * 显示气泡通知
 * @param {string} message 消息内容
 * @param {string} type 消息类型
 */
function showToast(message, type = 'info') {
    // 清除之前的定时器
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }
    
    // 获取或创建通知容器
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        document.body.appendChild(toastContainer);
    }
    
    // 创建通知元素
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    
    // 添加到容器
    toastContainer.appendChild(toast);
    
    // 显示通知
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // 3秒后隐藏通知
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

/**
 * WGS84转GCJ02坐标转换
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Object} 转换后的坐标
 */
function wgs84togcj02(lng, lat) {
    const pi = 3.1415926535897932384626;
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    
    if (out_of_china(lng, lat)) {
        return { lng: lng, lat: lat };
    }
    
    let dLat = transformLat(lng - 105.0, lat - 35.0);
    let dLng = transformLng(lng - 105.0, lat - 35.0);
    let radLat = lat / 180.0 * pi;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    let sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * pi);
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * pi);
    let mgLat = lat + dLat;
    let mgLng = lng + dLng;
    
    return { lng: mgLng, lat: mgLat };
}

/**
 * 判断是否在中国境外
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {boolean} 是否在中国境外
 */
function out_of_china(lng, lat) {
    return (lng < 72.004 || lng > 137.8347) || ((lat < 0.8293 || lat > 55.8271) || false);
}

/**
 * 纬度转换
 * @param {number} x x坐标
 * @param {number} y y坐标
 * @returns {number} 转换后的纬度
 */
function transformLat(x, y) {
    const pi = 3.1415926535897932384626;
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * pi) + 40.0 * Math.sin(y / 3.0 * pi)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * pi) + 320 * Math.sin(y * pi / 30.0)) * 2.0 / 3.0;
    return ret;
}

/**
 * 经度转换
 * @param {number} x x坐标
 * @param {number} y y坐标
 * @returns {number} 转换后的经度
 */
function transformLng(x, y) {
    const pi = 3.1415926535897932384626;
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * pi) + 40.0 * Math.sin(x / 3.0 * pi)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * pi) + 300.0 * Math.sin(x * pi / 30.0)) * 2.0 / 3.0;
    return ret;
}

// 监听迫击炮型号和装药级别的变化
document.getElementById('mortarType').addEventListener('change', function() {
    if (lat1 && lng1) {
        const mortarType = this.value;
        const chargeLevel = document.getElementById('chargeLevel').value;
        mapManager.drawRangeCircle(lng1, lat1, mortarType, chargeLevel);
        
        // 如果目标点已设置，重新计算
        if (lat2 && lng2) {
            calculateAndDisplayData();
        }
    }
});

document.getElementById('chargeLevel').addEventListener('change', function() {
    if (lat1 && lng1) {
        const mortarType = document.getElementById('mortarType').value;
        const chargeLevel = this.value;
        mapManager.drawRangeCircle(lng1, lat1, mortarType, chargeLevel);
        
        // 如果目标点已设置，重新计算
        if (lat2 && lng2) {
            calculateAndDisplayData();
        }
    }
});