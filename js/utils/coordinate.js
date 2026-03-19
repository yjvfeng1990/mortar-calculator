// 坐标系转换工具

/**
 * WGS84 坐标系转 GCJ02 坐标系
 */
function wgs84ToGcj02(lat, lng, callback) {
    if (typeof AMap !== 'undefined' && AMap.convertFrom) {
        AMap.convertFrom([lng, lat], 'gps', function(status, result) {
            console.log('高德坐标转换结果:', { status, result });
            if (status === 'complete' && result.info === 'ok') {
                const converted = result.locations[0];
                callback({
                    lat: converted.lat,
                    lng: converted.lng
                });
            } else {
                console.error('坐标转换失败:', status, result);
                const converted = wgs84ToGcj02Algorithm(lat, lng);
                callback(converted);
            }
        });
    } else {
        const converted = wgs84ToGcj02Algorithm(lat, lng);
        callback(converted);
    }
}

/**
 * WGS84 转 GCJ02 算法实现
 */
function wgs84ToGcj02Algorithm(lat, lng) {
    const PI = 3.1415926535897932384626;
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    
    if (outOfChina(lat, lng)) {
        return { lat: lat, lng: lng };
    }
    
    let dLat = transformLat(lng - 105.0, lat - 35.0);
    let dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
    
    const mgLat = lat + dLat;
    const mgLng = lng + dLng;
    
    return { lat: mgLat, lng: mgLng };
}

/**
 * 判断是否在中国范围外
 */
function outOfChina(lat, lng) {
    return (lng < 72.004 || lng > 137.8347) || (lat < 0.8293 || lat > 55.8271);
}

/**
 * 纬度转换
 */
function transformLat(x, y) {
    const PI = 3.1415926535897932384626;
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
}

/**
 * 经度转换
 */
function transformLng(x, y) {
    const PI = 3.1415926535897932384626;
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
}
