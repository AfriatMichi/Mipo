// Notification system
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// UI Management functions
function showLoginForm() {
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('register-section').classList.add('hidden');
    document.getElementById('setup-section').classList.add('hidden');
    document.getElementById('sessions-section').classList.add('hidden');
    document.getElementById('teacher-controls').classList.add('hidden');
    document.getElementById('status').classList.add('hidden');
    document.getElementById('counter').classList.add('hidden');
    document.getElementById('students-section').classList.add('hidden');
}

function showRegisterForm() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('register-section').classList.remove('hidden');
    document.getElementById('setup-section').classList.add('hidden');
    document.getElementById('sessions-section').classList.add('hidden');
    document.getElementById('teacher-controls').classList.add('hidden');
    document.getElementById('status').classList.add('hidden');
    document.getElementById('counter').classList.add('hidden');
    document.getElementById('students-section').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('register-section').classList.add('hidden');
    document.getElementById('setup-section').classList.remove('hidden');
    document.getElementById('sessions-section').classList.remove('hidden');
} 