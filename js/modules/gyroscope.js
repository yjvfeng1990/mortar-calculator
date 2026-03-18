// 陀螺仪功能模块

class Gyroscope {
    constructor() {
        this.enabled = false;
        this.deviceOrientation = null;
        this.isMobileDevice = false;
        this.gyroBtn = null;
        this.map = null;
        this.lat1 = null;
        this.lng1 = null;
        this.labelMe = null;
    }

    /**
     * 初始化陀螺仪
     * @param {Object} mapInstance 地图实例
     */
    init(mapInstance) {
        this.map = mapInstance;
        
        // 检测设备类型
        this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 获取陀螺仪按钮
        this.gyroBtn = document.getElementById('gyroBtn');
        
        if (this.isMobileDevice && window.DeviceOrientationEvent) {
            if (this.gyroBtn) {
                this.gyroBtn.style.display = 'block';
            }
        } else {
            // 非移动设备或不支持陀螺仪，隐藏按钮
            if (this.gyroBtn) {
                this.gyroBtn.style.display = 'none';
            }
        }
    }

    /**
     * 切换陀螺仪状态
     */
    toggle() {
        this.enabled = !this.enabled;
        
        if (this.gyroBtn) {
            if (this.enabled) {
                this.gyroBtn.innerText = '关闭陀螺仪';
                this.gyroBtn.style.background = '#dc3545';
                this.showToast('陀螺仪已开启，地图将自动旋转', 'success');
                this.initDeviceOrientation();
            } else {
                this.gyroBtn.innerText = '开启陀螺仪';
                this.gyroBtn.style.background = '#007bff';
                this.showToast('陀螺仪已关闭', 'info');
                // 重置地图旋转
                if (this.map) {
                    this.map.setRotation(0);
                }
                // 重置方位角显示
                this.updateAzimuthDisplay(0);
                // 重置炮位标签的陀螺仪数据
                if (this.lat1 && this.lng1) {
                    this.updateLabelMeWithGyro(0, 0);
                }
            }
        }
    }

    /**
     * 初始化设备方向（陀螺仪）
     */
    initDeviceOrientation() {
        console.log('初始化设备方向监听...');
        
        // 检查设备方向API是否可用
        if (window.DeviceOrientationEvent && 'ondeviceorientationabsolute' in window) {
            // 使用绝对方向事件（更准确）
            window.addEventListener('deviceorientationabsolute', (event) => this.handleOrientation(event));
            console.log('使用 deviceorientationabsolute 事件');
        } else if ('ondeviceorientation' in window) {
            // 使用普通方向事件
            window.addEventListener('deviceorientation', (event) => this.handleOrientation(event));
            console.log('使用 deviceorientation 事件');
        } else {
            console.log('设备方向API不可用');
            this.showToast('设备不支持陀螺仪功能', 'error');
            return;
        }
        
        // 检查是否需要权限请求
        this.checkGyroscopePermission();
    }

    /**
     * 检查陀螺仪权限
     */
    checkGyroscopePermission() {
        console.log('检查陀螺仪权限...');
        
        // 检查是否支持 DeviceOrientationEvent.requestPermission
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            console.log('需要请求陀螺仪权限');
            
            // 请求权限
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        console.log('陀螺仪权限已授予');
                        this.showToast('陀螺仪权限已授予', 'success');
                    } else {
                        console.log('陀螺仪权限被拒绝');
                        this.showToast('陀螺仪权限被拒绝，请在设置中允许访问', 'error');
                    }
                })
                .catch(error => {
                    console.error('请求陀螺仪权限失败:', error);
                    this.showToast('请求陀螺仪权限失败', 'error');
                });
        } else {
            console.log('不需要请求陀螺仪权限');
            this.showToast('陀螺仪已就绪', 'success');
        }
    }

    /**
     * 处理设备方向变化
     * @param {Event} event 方向事件
     */
    handleOrientation(event) {
        if (!this.enabled) {
            return; // 陀螺仪未开启，不处理
        }
        
        if (!event.alpha && !event.beta && !event.gamma) {
            return; // 没有方向数据
        }
        
        // 获取设备方向数据
        const alpha = event.alpha; // Z轴旋转（0-360度）
        const beta = event.beta; // X轴旋转（-180到180度）
        const gamma = event.gamma; // Y轴旋转（-90到90度）
        
        // 保存设备方向
        this.deviceOrientation = {
            alpha: alpha,
            beta: beta,
            gamma: gamma
        };
        
        console.log('设备方向变化:', {
            alpha: alpha.toFixed(1) + '°',
            beta: beta.toFixed(1) + '°',
            gamma: gamma.toFixed(1) + '°'
        });
        
        // 更新方位角显示
        this.updateAzimuthDisplay(alpha);
        
        // 更新炮位标签的陀螺仪数据
        if (this.lat1 && this.lng1) {
            this.updateLabelMeWithGyro(alpha, beta);
        }
        
        // 如果有炮位坐标，根据设备方向旋转地图
        if (this.lat1 && this.lng1 && this.map) {
            this.rotateMapByOrientation();
        }
    }

    /**
     * 更新方位角显示
     * @param {number} azimuth 方位角
     */
    updateAzimuthDisplay(azimuth) {
        const azimuthValue = document.getElementById('azimuthValue');
        if (azimuthValue) {
            // 确保方位角在 0-360 度范围内
            const normalizedAzimuth = (azimuth % 360 + 360) % 360;
            azimuthValue.textContent = normalizedAzimuth.toFixed(1) + '°';
        }
    }

    /**
     * 根据设备方向旋转地图
     */
    rotateMapByOrientation() {
        if (!this.deviceOrientation || !this.map) {
            return;
        }
        
        // 使用alpha值（方位角）旋转地图
        // alpha: 0-360度，表示设备相对于正北方的旋转角度
        const rotation = this.deviceOrientation.alpha;
        
        if (rotation !== null && !isNaN(rotation)) {
            // 高德地图使用旋转角度（0-360度）
            // 将alpha值转换为地图旋转角度
            const mapRotation = rotation;
            
            // 旋转地图
            this.map.setRotation(mapRotation);
            
            console.log('地图旋转角度:', mapRotation.toFixed(1) + '°');
        }
    }

    /**
     * 根据陀螺仪数据更新炮位标签
     * @param {number} azimuth 方位角
     * @param {number} pitch 俯仰角
     */
    updateLabelMeWithGyro(azimuth, pitch) {
        if(!this.lat1||!this.lng1) return;
        
        // 确保方位角在 0-360 度范围内
        const normalizedAzimuth = (azimuth % 360 + 360) % 360;
        
        // 处理俯仰角（beta值），转换为更直观的角度
        // beta: -180到180度，我们将其转换为 0-90 度的仰角
        let normalizedPitch = Math.abs(pitch);
        if (normalizedPitch > 90) {
            normalizedPitch = 180 - normalizedPitch;
        }
        
        // 获取当前迫击炮型号和装药级别
        const mortarType = document.getElementById('mortarType').value;
        const mortarTypeName = mortarType + 'mm';
        const chargeLevel = document.getElementById('chargeLevel').value;
        
        const labelText = '炮位 (' + mortarTypeName + ')\n装药: ' + chargeLevel + '号\n' + this.lat1.toFixed(4) + ', ' + this.lng1.toFixed(4) + '\n方位:' + normalizedAzimuth.toFixed(1) + '° 仰角:' + normalizedPitch.toFixed(1) + '°';
        
        // 更新或创建炮位标签
        if (this.labelMe) {
            this.labelMe.setText(labelText);
        } else {
            // 如果标签不存在，创建新标签
            this.labelMe = new AMap.Text({
                text: labelText,
                position: [this.lng1, this.lat1],
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
            this.map.add(this.labelMe);
        }
    }

    /**
     * 更新炮位坐标
     * @param {number} lat 纬度
     * @param {number} lng 经度
     */
    updatePosition(lat, lng) {
        this.lat1 = lat;
        this.lng1 = lng;
    }

    /**
     * 更新炮位标签引用
     * @param {Object} label 标签实例
     */
    updateLabel(label) {
        this.labelMe = label;
    }

    /**
     * 显示气泡通知
     * @param {string} message 消息内容
     * @param {string} type 消息类型
     */
    showToast(message, type = 'info') {
        // 使用全局的showToast函数
        if (typeof showToast === 'function') {
            showToast(message, type);
        }
    }
}

// 导出模块
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Gyroscope;
    }
} catch (e) {
    // 浏览器环境
    window.Gyroscope = Gyroscope;
}