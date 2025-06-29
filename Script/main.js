// Global variables
let students = [];
let isCountingActive = false;
let teacherName = '';
let className = '';
let currentTripId = null;
let currentUser = null;

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to be available
    const checkFirebase = () => {
        if (window.auth && window.onAuthStateChanged) {
            // Check authentication state on page load
            onAuthStateChanged(auth, (user) => {
                currentUser = user;
                updateUserUI();
                
                if (user) {
                    showMainApp();
                    loadTrips();
                } else {
                    showLoginForm();
                }
            });
        } else {
            // Firebase not ready yet, try again in 100ms
            setTimeout(checkFirebase, 100);
        }
    };
    
    checkFirebase();
});

// Save data when user leaves the page
window.addEventListener('beforeunload', function() {
    if (currentUser && teacherName && className && students.length > 0) {
        autoSaveTrip();
    }
});

// עדכון אוטומטי של הזמן
setInterval(() => {
    if (isCountingActive) {
        updateCounter();
    }
}, 1000);

// Auto-save every 30 seconds if there's an active session
setInterval(() => {
    if (currentUser && currentTripId && teacherName && className && students.length > 0) {
        autoSaveTrip();
    }
}, 30000); 