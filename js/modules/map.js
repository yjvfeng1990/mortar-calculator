// 地图功能模块

let map = null;
let isSatellite = true;
let markerMe = null;
let markerTarget = null;
let labelMe = null;
let labelTarget = null;
let polyline = null;
let distanceLabel = null;
let rangeCircle = null;

/**
 * 初始化地图
 */
function initMap() {
    try {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(navigator.userAgent);
        
        const mapConfig = {
            zoom: isMobile ? 13 : 14,
            center: [116.397428, 39.90923],
            resizeEnable: true,
            layers: [
                new AMap.TileLayer.Satellite(),
                new AMap.TileLayer.RoadNet()
            ]
        };
        
        if (isMobile) {
            mapConfig.touchZoom = true;
            mapConfig.scrollWheel = false;
            mapConfig.doubleClickZoom = true;
            window.isMobileDevice = true;
        }
        
        map = new AMap.Map('map', mapConfig);
        console.log('地图初始化成功，设备类型:', isMobile ? '手机' : isTablet ? '平板' : 'PC');
        
        if (window.isMobileDevice && window.DeviceOrientationEvent) {
            gyroBtn = document.getElementById('gyroBtn');
            if (gyroBtn) {
                gyroBtn.style.display = 'block';
            }
        } else {
            gyroBtn = document.getElementById('gyroBtn');
            if (gyroBtn) {
                gyroBtn.style.display = 'none';
            }
        }
        
        showToast('地图加载成功！', 'success');
        
        map.on('click', e => {
            // 使用 window 对象访问全局变量
            window.lat2 = e.lnglat.getLat();
            window.lng2 = e.lnglat.getLng();

            document.getElementById('lat2').innerText = window.lat2.toFixed(6);
            document.getElementById('lng2').innerText = window.lng2.toFixed(6);

            if (markerTarget) map.remove(markerTarget);

            markerTarget = new AMap.Marker({
                position: [window.lng2, window.lat2],
                title: "目标"
            });
            map.add(markerTarget);

            if (window.lat1 && window.lng1) {
                if (typeof calcAll === 'function') {
                    calcAll();
                }
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                setTimeout(autoFitView, isMobile ? 300 : 150);
            } else {
                if (typeof calcAll === 'function') {
                    calcAll();
                }
            }
        });
    } catch (error) {
        console.error('地图初始化失败:', error);
        showToast('地图加载失败：' + error.message, 'error');
    }
}

/**
 * 切换地图类型
 */
function toggleMapType() {
    if (!map) return;
    
    const btn = document.getElementById('mapTypeBtn');
    
    if (isSatellite) {
        map.setLayers([new AMap.TileLayer()]);
        isSatellite = false;
        if (btn) btn.innerText = '切换地图类型 (普通)';
    } else {
        map.setLayers([
            new AMap.TileLayer.Satellite(),
            new AMap.TileLayer.RoadNet()
        ]);
        isSatellite = true;
        if (btn) btn.innerText = '切换地图类型 (卫星)';
    }
}

/**
 * 绘制最大射程圆形
 */
function drawRangeCircle() {
    if (!window.lat1 || !window.lng1 || !map) {
        return;
    }
    
    if (rangeCircle) {
        map.remove(rangeCircle);
        rangeCircle = null;
    }
    
    const mortarType = document.getElementById('mortarType').value;
    const chargeLevel = document.getElementById('chargeLevel').value;
    const maxRange = config.maxRangeData[mortarType][chargeLevel];
    
    rangeCircle = new AMap.Circle({
        center: [window.lng1, window.lat1],
        radius: maxRange,
        strokeColor: '#FF0000',
        strokeWeight: 2,
        strokeOpacity: 0.8,
        fillColor: '#FF0000',
        fillOpacity: 0.15,
        zIndex: 1,
        bubble: true,
        clickable: false
    });
    
    map.add(rangeCircle);
    
    console.log('绘制最大射程圆形:', {
        炮位:[window.lat1, window.lng1],
        迫击炮型号:mortarType + 'mm',
        装药量:chargeLevel + '号',
        最大射程:maxRange + '米'
    });
}

/**
 * 显示炮位标签
 */
function showLabelMe() {
    if (!window.lat1 || !window.lng1) return;
    
    const mortarType = document.getElementById('mortarType').value;
    const mortarTypeName = mortarType + 'mm';
    const chargeLevel = document.getElementById('chargeLevel').value;
    
    const labelText = '炮位 (' + mortarTypeName + ')\n装药：' + chargeLevel + '号\n' + window.lat1.toFixed(4) + ', ' + window.lng1.toFixed(4);
    
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
 * 自动调整地图视角
 */
function autoFitView() {
    if (!map || !markerMe) return;
    
    if (markerTarget) {
        map.setFitView([markerMe, markerTarget], false, [50, 50, 50, 50], 15);
    } else {
        map.setFitView([markerMe], false, [50, 50, 50, 50], 16);
    }
}
