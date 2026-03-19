// 弹道计算模块

/**
 * 计算仰角
 * 返回仰角度数，如果超出射程返回 -2
 */
function calculateElevation(distance, mortarType, chargeLevel) {
    const data = config.mortarData[mortarType] && config.mortarData[mortarType][chargeLevel];
    if (!data) return -1;
    
    const maxRange = config.maxRangeData[mortarType][chargeLevel];
    
    // 超出最大射程
    if (distance > maxRange) {
        return -2;
    }
    
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
 * 计算方位�? */
function calculateAzimuth(lat1, lng1, lat2, lng2) {
    const y = Math.sin((lng2 - lng1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lng2 - lng1) * Math.PI / 180);
    const azimuth = Math.atan2(y, x) * 180 / Math.PI;
    return (azimuth + 360) % 360;
}

/**
 * 计算距离
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * 计算飞行时间
 */
function calculateFlightTime(distance, elevation) {
    const g = config.trajectory.g;
    const v0 = Math.sqrt(distance * g / Math.sin(2 * elevation * Math.PI / 180));
    return 2 * v0 * Math.sin(elevation * Math.PI / 180) / g;
}

/**
 * 获取最大射�? */
function getMaxRange(mortarType, chargeLevel) {
    return config.maxRangeData[mortarType] && config.maxRangeData[mortarType][chargeLevel];
}

