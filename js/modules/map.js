// 地图相关功能模块

class MapManager {
    constructor() {
        this.map = null;
        this.isSatellite = true;
        this.markerMe = null;
        this.markerTarget = null;
        this.labelMe = null;
        this.labelTarget = null;
        this.polyline = null;
        this.trajectoryPolyline = null;
        this.trajectoryLabels = [];
        this.distanceLabel = null;
        this.rangeCircle = null;
        
        // 从配置文件获取最大射程数据
        this.maxRangeData = window.config ? window.config.maxRangeData : {
            60: {0:800, 1:1200, 2:1600, 3:2000, 4:2500},
            82: {0:1200, 1:1800, 2:2400, 3:3000, 4:3600},
            120: {0:2000, 1:3000, 2:4000, 3:5000, 4:6000}
        };
    }

    /**
     * 初始化地图
     * @returns {Promise} 地图初始化 Promise
     */
    init() {
        return new Promise((resolve, reject) => {
            try {
                // 从配置文件获取地图配置
                const mapConfigDefault = window.config ? window.config.map : {
                    defaultCenter: [116.397428, 39.90923],
                    defaultZoom: 14,
                    mobileZoom: 13,
                    tabletZoom: 13
                };
                
                // 检测设备类型
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(navigator.userAgent);
                
                // 根据设备类型设置不同的地图配置
                const mapConfig = {
                    zoom: isMobile ? mapConfigDefault.mobileZoom : mapConfigDefault.defaultZoom,
                    center: mapConfigDefault.defaultCenter,
                    resizeEnable: true,
                    layers: [
                        new AMap.TileLayer.Satellite(),
                        new AMap.TileLayer.RoadNet()
                    ]
                };
                
                // 手机设备添加额外的触摸配置
                if (isMobile) {
                    mapConfig.touchZoom = true;
                    mapConfig.scrollWheel = false;
                    mapConfig.doubleClickZoom = true;
                }
                
                this.map = new AMap.Map('map', mapConfig);
                console.log('地图初始化成功，设备类型:', isMobile ? '手机' : isTablet ? '平板' : 'PC');
                
                resolve(this.map);
            } catch (error) {
                console.error('地图初始化失败:', error);
                reject(error);
            }
        });
    }

    /**
     * 切换地图类型
     */
    toggleMapType() {
        if (!this.map) return;
        
        this.isSatellite = !this.isSatellite;
        
        if (this.isSatellite) {
            // 切换到卫星地图
            this.map.setLayers([
                new AMap.TileLayer.Satellite(),
                new AMap.TileLayer.RoadNet()
            ]);
        } else {
            // 切换到普通地图
            this.map.setLayers([
                new AMap.TileLayer()
            ]);
        }
        
        const btn = document.getElementById('mapTypeBtn');
        if (btn) {
            btn.innerText = this.isSatellite ? '切换地图类型 (卫星)' : '切换地图类型 (普通)';
        }
    }

    /**
     * 绘制最大射程圆形
     * @param {number} lng1 炮位经度
     * @param {number} lat1 炮位纬度
     * @param {number} mortarType 迫击炮型号
     * @param {number} chargeLevel 装药级别
     */
    drawRangeCircle(lng1, lat1, mortarType, chargeLevel) {
        if (!this.map || !lng1 || !lat1) return;
        
        // 移除之前的圆形
        if (this.rangeCircle) {
            this.map.remove(this.rangeCircle);
        }
        
        // 获取最大射程
        const maxRange = this.maxRangeData[mortarType] && this.maxRangeData[mortarType][chargeLevel] || 0;
        
        if (maxRange > 0) {
            // 绘制圆形
            this.rangeCircle = new AMap.Circle({
                center: [lng1, lat1], // 圆心位置（炮位坐标）
                radius: maxRange, // 半径（最大射程，单位：米）
                strokeColor: '#FF0000', // 边框颜色：红色
                strokeWeight: 2, // 边框宽度
                strokeOpacity: 0.8, // 边框透明度
                fillColor: '#FF0000', // 填充颜色：红色
                fillOpacity: 0.15, // 填充透明度：15%（半透明）
                zIndex: 1, // 层级（设置为较低，确保在标记下方）
                bubble: true, // 允许事件冒泡
                clickable: false // 禁止圆形本身可点击，允许点击穿透
            });
            
            this.map.add(this.rangeCircle);
            
            console.log('绘制最大射程圆形:', {
                炮位: [lat1, lng1],
                迫击炮型号: mortarType + 'mm',
                装药量: chargeLevel + '号',
                最大射程: maxRange + '米'
            });
        }
    }

    /**
     * 绘制炮位点
     * @param {number} lng1 炮位经度
     * @param {number} lat1 炮位纬度
     */
    drawMarkerMe(lng1, lat1) {
        if (!this.map || !lng1 || !lat1) return;
        
        // 移除之前的标记
        if (this.markerMe) {
            this.map.remove(this.markerMe);
        }
        
        // 添加炮位标记
        this.markerMe = new AMap.Marker({
            position: [lng1, lat1],
            title: "炮位"
        });
        
        this.map.add(this.markerMe);
    }

    /**
     * 绘制目标点
     * @param {number} lng2 目标经度
     * @param {number} lat2 目标纬度
     */
    drawMarkerTarget(lng2, lat2) {
        if (!this.map || !lng2 || !lat2) return;
        
        // 移除之前的标记
        if (this.markerTarget) {
            this.map.remove(this.markerTarget);
        }
        
        // 添加目标标记
        this.markerTarget = new AMap.Marker({
            position: [lng2, lat2],
            title: "目标"
        });
        
        this.map.add(this.markerTarget);
    }

    /**
     * 显示炮位坐标标签
     * @param {number} lng1 炮位经度
     * @param {number} lat1 炮位纬度
     * @param {string} mortarTypeName 迫击炮型号名称
     * @param {string} chargeLevel 装药级别
     * @param {string} azText 方位角文本
     * @param {string} elText 仰角文本
     */
    showLabelMe(lng1, lat1, mortarTypeName, chargeLevel, azText = '--', elText = '--') {
        if (!this.map || !lng1 || !lat1) return;
        
        // 移除之前的炮位标签
        if (this.labelMe) {
            this.map.remove(this.labelMe);
        }
        
        // 添加炮位坐标标签
        this.labelMe = new AMap.Text({
            text: '炮位 (' + mortarTypeName + ')\n装药: ' + chargeLevel + '号\n' + lat1.toFixed(4) + ', ' + lng1.toFixed(4) + '\n方位:' + azText + ' 仰角:' + elText,
            position: [lng1, lat1],
            offset: new AMap.Pixel(0, -60), // 调整偏移量以容纳更多内容
            style: {
                'background-color': '#0f0',
                'color': '#000',
                'padding': '4px 12px',
                'border-radius': '4px',
                'font-size': '11px',
                'border': '1px solid #000'
            }
        });
        
        this.map.add(this.labelMe);
    }

    /**
     * 显示目标坐标标签
     * @param {number} lng2 目标经度
     * @param {number} lat2 目标纬度
     * @param {string} distance 距离
     * @param {string} azText 方位角文本
     * @param {string} elText 仰角文本
     * @param {string} flightTime 飞行时间
     */
    showLabelTarget(lng2, lat2, distance, azText, elText, flightTime) {
        if (!this.map || !lng2 || !lat2) return;
        
        // 移除之前的目标标签
        if (this.labelTarget) {
            this.map.remove(this.labelTarget);
        }
        
        // 显示目标坐标标签
        this.labelTarget = new AMap.Text({
            text: '目标\n' + lat2.toFixed(4) + ', ' + lng2.toFixed(4) + '\n距离:' + distance + '米\n方位:' + azText + ' 仰角:' + elText + '\n飞行时间:' + flightTime + '秒',
            position: [lng2, lat2],
            offset: new AMap.Pixel(0, -80),
            style: {
                'background-color': '#00f',
                'color': '#fff',
                'padding': '4px 12px',
                'border-radius': '4px',
                'font-size': '11px',
                'border': '1px solid #000'
            }
        });
        
        this.map.add(this.labelTarget);
    }

    /**
     * 绘制炮位和目标点之间的连线
     * @param {number} lng1 炮位经度
     * @param {number} lat1 炮位纬度
     * @param {number} lng2 目标经度
     * @param {number} lat2 目标纬度
     */
    drawLine(lng1, lat1, lng2, lat2) {
        if (!this.map || !lng1 || !lat1 || !lng2 || !lat2) return;
        
        // 移除之前的连线
        if (this.polyline) {
            this.map.remove(this.polyline);
        }
        
        // 绘制连线
        this.polyline = new AMap.Polyline({
            path: [[lng1, lat1], [lng2, lat2]],
            strokeColor: '#00f',
            strokeWeight: 2,
            strokeOpacity: 0.8
        });
        
        this.map.add(this.polyline);
    }

    /**
     * 绘制弹道轨迹
     * @param {number} lng1 炮位经度
     * @param {number} lat1 炮位纬度
     * @param {number} lng2 目标经度
     * @param {number} lat2 目标纬度
     * @param {Array} trajectoryPoints 轨迹点
     */
    drawTrajectory(lng1, lat1, lng2, lat2, trajectoryPoints) {
        if (!this.map || !lng1 || !lat1 || !lng2 || !lat2 || !trajectoryPoints || trajectoryPoints.length === 0) return;
        
        // 移除之前的轨迹
        if (this.trajectoryPolyline) {
            this.map.remove(this.trajectoryPolyline);
        }
        
        // 清除之前的轨迹标签
        this.trajectoryLabels.forEach(label => {
            if (label) {
                this.map.remove(label);
            }
        });
        this.trajectoryLabels = [];
        
        // 计算轨迹点的地理坐标
        const geoPoints = [];
        const distance = Math.sqrt(Math.pow(lng2 - lng1, 2) + Math.pow(lat2 - lat1, 2));
        
        trajectoryPoints.forEach((point, index) => {
            const ratio = point.x / trajectoryPoints[trajectoryPoints.length - 1].x;
            const lng = lng1 + (lng2 - lng1) * ratio;
            const lat = lat1 + (lat2 - lat1) * ratio;
            geoPoints.push([lng, lat]);
            
            // 添加高度标签
            if (point.y > 1.0 && index % 2 === 0) {
                const label = new AMap.Text({
                    text: Math.round(point.y) + 'm',
                    position: [lng, lat],
                    offset: new AMap.Pixel(0, -20),
                    style: {
                        'background-color': '#ff0',
                        'color': '#000',
                        'padding': '2px 8px',
                        'border-radius': '4px',
                        'font-size': '10px',
                        'border': '1px solid #000'
                    }
                });
                this.map.add(label);
                this.trajectoryLabels.push(label);
            }
        });
        
        // 绘制弹道轨迹
        this.trajectoryPolyline = new AMap.Polyline({
            path: geoPoints,
            strokeColor: '#ff0',
            strokeWeight: 3,
            strokeOpacity: 0.8,
            lineJoin: 'round',
            lineCap: 'round'
        });
        
        this.map.add(this.trajectoryPolyline);
        
        // 添加箭头标记
        const arrowMarker = new AMap.Marker({
            position: geoPoints[Math.floor(geoPoints.length / 2)],
            icon: new AMap.Icon({
                size: new AMap.Size(20, 20),
                image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ff0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
                imageSize: new AMap.Size(20, 20)
            }),
            rotation: this.calculateArrowRotation(lng1, lat1, lng2, lat2)
        });
        
        this.map.add(arrowMarker);
    }

    /**
     * 计算箭头旋转角度
     * @param {number} lng1 炮位经度
     * @param {number} lat1 炮位纬度
     * @param {number} lng2 目标经度
     * @param {number} lat2 目标纬度
     * @returns {number} 旋转角度
     */
    calculateArrowRotation(lng1, lat1, lng2, lat2) {
        const angle = Math.atan2(lng2 - lng1, lat2 - lat1) * 180 / Math.PI;
        return angle;
    }

    /**
     * 调整地图视角，显示两个点
     * @param {number} lng1 炮位经度
     * @param {number} lat1 炮位纬度
     * @param {number} lng2 目标经度
     * @param {number} lat2 目标纬度
     */
    fitBounds(lng1, lat1, lng2, lat2) {
        if (!this.map || !lng1 || !lat1 || !lng2 || !lat2) return;
        
        const southWest = new AMap.LngLat(Math.min(lng1, lng2), Math.min(lat1, lat2));
        const northEast = new AMap.LngLat(Math.max(lng1, lng2), Math.max(lat1, lat2));
        const bounds = new AMap.Bounds(southWest, northEast);
        
        this.map.setBounds(bounds, true);
    }

    /**
     * 设置地图中心点
     * @param {number} lng 经度
     * @param {number} lat 纬度
     * @param {number} zoom 缩放级别
     */
    setCenter(lng, lat, zoom = 16) {
        if (!this.map || !lng || !lat) return;
        
        this.map.setCenter([lng, lat]);
        this.map.setZoom(zoom);
    }

    /**
     * 清除所有标记和图层
     */
    clearAll() {
        if (!this.map) return;
        
        // 移除标记
        if (this.markerMe) this.map.remove(this.markerMe);
        if (this.markerTarget) this.map.remove(this.markerTarget);
        if (this.labelMe) this.map.remove(this.labelMe);
        if (this.labelTarget) this.map.remove(this.labelTarget);
        if (this.polyline) this.map.remove(this.polyline);
        if (this.trajectoryPolyline) this.map.remove(this.trajectoryPolyline);
        if (this.distanceLabel) this.map.remove(this.distanceLabel);
        if (this.rangeCircle) this.map.remove(this.rangeCircle);
        
        // 清除轨迹标签
        this.trajectoryLabels.forEach(label => {
            if (label) {
                this.map.remove(label);
            }
        });
        this.trajectoryLabels = [];
        
        // 重置引用
        this.markerMe = null;
        this.markerTarget = null;
        this.labelMe = null;
        this.labelTarget = null;
        this.polyline = null;
        this.trajectoryPolyline = null;
        this.distanceLabel = null;
        this.rangeCircle = null;
    }

    /**
     * 获取地图实例
     * @returns {Object} 地图实例
     */
    getMap() {
        return this.map;
    }

    /**
     * 获取炮位标签实例
     * @returns {Object} 炮位标签实例
     */
    getLabelMe() {
        return this.labelMe;
    }
}

// 导出模块
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MapManager;
    }
} catch (e) {
    // 浏览器环境
    window.MapManager = MapManager;
}