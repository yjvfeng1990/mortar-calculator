// UI 工具函数

let toastTimeout = null;

/**
 * 显示悬浮气泡通知
 */
function showToast(message, type = 'info', duration = 3000) {
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }
    
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification ' + type;
    toast.innerText = message;
    
    container.innerHTML = '';
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}
