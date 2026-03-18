// 计算相关功能模块

// 从配置文件获取数据
const mortarData = window.config ? window.config.mortarData : {
    60: {0:85, 1:100, 2:130, 3:150, 4:180},
    82: {0:120, 1:150, 2:180, 3:210, 4:240},
    120: {0:160, 1:200, 2:240, 3:280, 4:320}
};

// 最大射程数据（单位：米）
const maxRangeData = window.config ? window.config.maxRangeData : {
    60: {0:800, 1:1200, 2:1600, 3:2000, 4:2500},
    82: {0:1200, 1:1800, 2:2400, 3:3000, 4:3600},
    120: {0:2000, 1:3000, 2:4000, 3:5000, 4:6000}
};

// 常量
const g = window.config ? window.config.trajectory.g : 9.8; // 重力加速度

/**
 * 计算两点之间的距离
 * @param {number} lat1 第一个点的纬度
 * @param {number} lng1 第一个点的经度
 * @param {number} lat2 第二个点的纬度
 * @param {number} lng2 第二个点的经度
 * @returns {number} 距离（米）
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // 地球半径（米）
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * 计算方位角
 * @param {number} lat1 第一个点的纬度
 * @param {number} lng1 第一个点的经度
 * @param {number} lat2 第二个点的纬度
 * @param {number} lng2 第二个点的经度
 * @returns {number} 方位角（度）
 */
function calculateAzimuth(lat1, lng1, lat2, lng2) {
    const ΔLng = lng2 - lng1;
    const ΔLat = lat2 - lat1;
    let azimuth = Math.atan2(ΔLng, ΔLat) * (180 / Math.PI);
    if (azimuth < 0) {
        azimuth += 360;
    }
    return azimuth;
}

/**
 * 计算仰角
 * @param {number} distance 距离（米）
 * @param {number} mortarType 迫击炮型号
 * @param {number} chargeLevel 装药级别
 * @returns {number} 仰角（度）
 */
function calculateElevation(distance, mortarType, chargeLevel) {
    const data = mortarData[mortarType] && mortarData[mortarType][chargeLevel];
    if (!data) return 45; // 默认45度
    
    const maxRange = maxRangeData[mortarType][chargeLevel];
    const ratio = distance / maxRange;
    let elevation;
    
    if (ratio <= 0.5) {
        elevation = data - ratio * 20;
    } else {
        elevation = data - 10 - (ratio - 0.5) * 10;
    }
    
    return Math.max(30, Math.min(85, elevation));
}

/**
 * 计算弹道轨迹点
 * @param {number} distance 距离（米）
 * @param {number} elevation 仰角（度）
 * @returns {Array} 轨迹点数组
 */
function calculateTrajectory(distance, elevation) {
    const points = [];
    const step = 50; // 步长
    
    // 将角度转换为弧度
    const angleRad = (elevation * Math.PI) / 180;
    
    // 计算初速度
    const v0 = Math.sqrt((distance * g) / Math.sin(2 * angleRad));
    
    // 计算飞行时间
    const t = (2 * v0 * Math.sin(angleRad)) / g;
    
    // 计算轨迹点
    for (let i = 0; i <= distance; i += step) {
        const tCurrent = (i / distance) * t;
        const x = v0 * Math.cos(angleRad) * tCurrent;
        const y = v0 * Math.sin(angleRad) * tCurrent - 0.5 * g * tCurrent * tCurrent;
        
        points.push({ x, y });
    }
    
    return points;
}

/**
 * 计算炮弹落地时间
 * @param {number} distance 距离（米）
 * @param {number} elevation 仰角（度）
 * @returns {number} 落地时间（秒）
 */
function calculateFlightTime(distance, elevation) {
    const angleRad = (elevation * Math.PI) / 180;
    const v0 = Math.sqrt((distance * g) / Math.sin(2 * angleRad));
    const t = (2 * v0 * Math.sin(angleRad)) / g;
    return t;
}

/**
 * 获取最大射程
 * @param {number} mortarType 迫击炮型号
 * @param {number} chargeLevel 装药级别
 * @returns {number} 最大射程（米）
 */
function getMaxRange(mortarType, chargeLevel) {
    return maxRangeData[mortarType] && maxRangeData[mortarType][chargeLevel] || 0;
}

// 导出模块
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            calculateDistance,
            calculateAzimuth,
            calculateElevation,
            calculateTrajectory,
            calculateFlightTime,
            getMaxRange
        };
    }
} catch (e) {
    // 浏览器环境
    window.calculator = {
        calculateDistance,
        calculateAzimuth,
        calculateElevation,
        calculateTrajectory,
        calculateFlightTime,
        getMaxRange
    };
}