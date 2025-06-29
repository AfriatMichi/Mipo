// Counting system functions
function startCounting() {
    isCountingActive = true;
    updateStatus();
    
    // Auto-save when counting starts
    autoSaveTrip();
}

function stopCounting() {
    isCountingActive = false;
    updateStatus();
    
    const presentCount = students.filter(s => s.present).length;
    const totalCount = students.length;
    
    // Show result in status instead of alert
    const statusText = document.getElementById('status-text');
    statusText.textContent = `⏹️ הספירה הסתיימה - נוכחים: ${presentCount} מתוך ${totalCount} תלמידים`;
    
    // Auto-save when counting stops
    autoSaveTrip();
}

function resetAttendance() {
    if (confirm('האם אתה בטוח שברצונך לאפס את הנוכחות של כל התלמידים?')) {
        students.forEach(student => student.present = false);
        displayStudents();
        updateCounter();
        
        // Auto-save when attendance is reset
        autoSaveTrip();
    }
}

function newSession() {
    if (confirm('האם אתה בטוח שברצונך להתחיל מחדש? כל הנתונים הנוכחיים יאבדו.')) {
        students = [];
        isCountingActive = false;
        teacherName = '';
        className = '';
        currentTripId = null;
        
        document.getElementById('teacher-name').value = '';
        document.getElementById('class-name').value = '';
        document.getElementById('students-list').value = '';
        
        document.getElementById('setup-section').classList.remove('hidden');
        document.getElementById('teacher-controls').classList.add('hidden');
        document.getElementById('status').classList.add('hidden');
        document.getElementById('counter').classList.add('hidden');
        document.getElementById('students-section').classList.add('hidden');
    }
}

function updateStatus() {
    const statusElement = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    const autoSaveIndicator = document.getElementById('auto-save-indicator');
    
    if (isCountingActive) {
        statusElement.className = 'status counting pulse';
        statusText.textContent = '🔄 הספירה פעילה - תלמידים יכולים לסמן את עצמם';
    } else {
        statusElement.className = 'status stopped';
        statusText.textContent = '⏸️ הספירה מושהית - ממתין להפעלה';
    }
    
    // Show auto-save indicator only if there's an active session
    if (currentTripId && teacherName && className && students.length > 0) {
        autoSaveIndicator.style.display = 'block';
    } else {
        autoSaveIndicator.style.display = 'none';
    }
} 