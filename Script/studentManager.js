// Student management functions
function setupStudents() {
    teacherName = document.getElementById('teacher-name').value.trim();
    className = document.getElementById('class-name').value.trim();
    const studentsText = document.getElementById('students-list').value.trim();
    
    if (!teacherName || !className || !studentsText) {
        alert('אנא מלא את כל השדות');
        return;
    }

    const studentNames = studentsText.split('\n').map(name => name.trim()).filter(name => name);
    
    if (studentNames.length === 0) {
        alert('אנא הכנס לפחות תלמיד אחד');
        return;
    }

    students = studentNames.map(name => ({
        name: name,
        present: false,
        id: Math.random().toString(36).substr(2, 9)
    }));

    currentTripId = null; // Reset session ID for new session

    document.getElementById('setup-section').classList.add('hidden');
    document.getElementById('teacher-controls').classList.remove('hidden');
    document.getElementById('status').classList.remove('hidden');
    document.getElementById('counter').classList.remove('hidden');
    document.getElementById('students-section').classList.remove('hidden');

    updateCounter();
    displayStudents();
    updateStatus();
    
    // Auto-save the new session
    autoSaveTrip();
}

function displayStudents() {
    const grid = document.getElementById('students-grid');
    grid.innerHTML = '';

    students.forEach(student => {
        const card = document.createElement('div');
        card.className = `student-card ${student.present ? 'present' : ''}`;
        card.onclick = () => toggleStudent(student.id);
        
        card.innerHTML = `
            <div class="student-name">${student.name}</div>
            <div class="student-status">${student.present ? 'נוכח ✓' : 'לא נוכח'}</div>
        `;
        
        grid.appendChild(card);
    });
}

function toggleStudent(studentId) {
    if (!isCountingActive) {
        alert('הספירה לא פעילה כרגע. אנא בקש מהמורה להפעיל את הספירה.');
        return;
    }

    const student = students.find(s => s.id === studentId);
    if (student) {
        student.present = !student.present;
        displayStudents();
        updateCounter();
        
        // Auto-save when attendance changes
        autoSaveTrip();
        
        // אפקט ויזואלי
        const card = document.querySelector(`[onclick="toggleStudent('${studentId}')"]`);
        if (card) {
            card.classList.add('pulse');
            setTimeout(() => card.classList.remove('pulse'), 1000);
        }
    }
}

function updateCounter() {
    const presentCount = students.filter(s => s.present).length;
    const totalCount = students.length;
    
    document.getElementById('present-count').textContent = presentCount;
    document.getElementById('total-count').textContent = totalCount;
} 