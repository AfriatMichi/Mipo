let students = [];
let isCountingActive = false;
let teacherName = '';
let className = '';
let currentSessionId = null;

// Firebase functions
async function saveSession() {
    console.log('saveSession called');
    console.log('teacherName:', teacherName);
    console.log('className:', className);
    console.log('students:', students);
    
    // Check if Firebase is available
    if (typeof db === 'undefined' || typeof addDoc === 'undefined') {
        console.error('Firebase functions not available!');
        alert('שגיאה: Firebase לא זמין. אנא רענן את הדף.');
        return;
    }
    
    if (!teacherName || !className || students.length === 0) {
        alert('אנא הגדר תלמידים לפני השמירה');
        return;
    }

    try {
        const sessionData = {
            teacherName: teacherName,
            className: className,
            students: students,
            isCountingActive: isCountingActive,
            createdAt: new Date(),
            lastUpdated: new Date()
        };

        console.log('Session data to save:', sessionData);

        if (currentSessionId) {
            // Update existing session
            console.log('Updating existing session:', currentSessionId);
            const sessionRef = doc(db, 'sessions', currentSessionId);
            await updateDoc(sessionRef, {
                ...sessionData,
                lastUpdated: new Date()
            });
            alert('הסשן עודכן בהצלחה!');
        } else {
            // Create new session
            console.log('Creating new session');
            const docRef = await addDoc(collection(db, 'sessions'), sessionData);
            currentSessionId = docRef.id;
            console.log('New session created with ID:', currentSessionId);
            alert('הסשן נשמר בהצלחה!');
        }
        
        loadSessions();
    } catch (error) {
        console.error('Error saving session:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        alert('שגיאה בשמירת הסשן: ' + error.message);
    }
}

async function loadSessions() {
    console.log('loadSessions called');
    
    // Check if Firebase is available
    if (typeof db === 'undefined' || typeof getDocs === 'undefined') {
        console.error('Firebase functions not available!');
        document.getElementById('sessions-list').innerHTML = '<p>שגיאה: Firebase לא זמין</p>';
        return;
    }
    
    try {
        const sessionsList = document.getElementById('sessions-list');
        sessionsList.innerHTML = '<p>טוען סשנים...</p>';

        console.log('Fetching sessions from database...');
        const querySnapshot = await getDocs(collection(db, 'sessions'));
        console.log('Query snapshot:', querySnapshot);
        console.log('Number of sessions found:', querySnapshot.size);
        
        sessionsList.innerHTML = '';

        if (querySnapshot.empty) {
            console.log('No sessions found in database');
            sessionsList.innerHTML = '<p>אין סשנים שמורים</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            console.log('Processing session:', doc.id, doc.data());
            const session = doc.data();
            const sessionDiv = document.createElement('div');
            sessionDiv.className = 'session-item';
            sessionDiv.style.cssText = `
                background: white;
                border: 2px solid #ddd;
                border-radius: 10px;
                padding: 15px;
                margin: 10px 0;
                cursor: pointer;
                transition: all 0.3s;
            `;
            
            sessionDiv.innerHTML = `
                <h3>${session.teacherName} - ${session.className}</h3>
                <p>תלמידים: ${session.students.length}</p>
                <p>נוכחים: ${session.students.filter(s => s.present).length}</p>
                <p>נוצר: ${session.createdAt.toDate().toLocaleString('he-IL')}</p>
                <button class="btn" onclick="loadSession('${doc.id}')" style="margin: 5px;">📂 טען</button>
                <button class="btn btn-danger" onclick="deleteSession('${doc.id}')" style="margin: 5px;">🗑️ מחק</button>
            `;
            
            sessionDiv.onmouseover = () => {
                sessionDiv.style.transform = 'translateY(-2px)';
                sessionDiv.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
            };
            
            sessionDiv.onmouseout = () => {
                sessionDiv.style.transform = 'translateY(0)';
                sessionDiv.style.boxShadow = 'none';
            };
            
            sessionsList.appendChild(sessionDiv);
        });
    } catch (error) {
        console.error('Error loading sessions:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        document.getElementById('sessions-list').innerHTML = '<p>שגיאה בטעינת סשנים</p>';
    }
}

async function loadSession(sessionId) {
    try {
        const sessionRef = doc(db, 'sessions', sessionId);
        const sessionDoc = await getDocs(collection(db, 'sessions'));
        
        let sessionData = null;
        sessionDoc.forEach((doc) => {
            if (doc.id === sessionId) {
                sessionData = doc.data();
            }
        });

        if (sessionData) {
            teacherName = sessionData.teacherName;
            className = sessionData.className;
            students = sessionData.students;
            isCountingActive = sessionData.isCountingActive;
            currentSessionId = sessionId;

            // Update UI
            document.getElementById('teacher-name').value = teacherName;
            document.getElementById('class-name').value = className;
            document.getElementById('students-list').value = students.map(s => s.name).join('\n');

            document.getElementById('setup-section').classList.add('hidden');
            document.getElementById('teacher-controls').classList.remove('hidden');
            document.getElementById('status').classList.remove('hidden');
            document.getElementById('counter').classList.remove('hidden');
            document.getElementById('students-section').classList.remove('hidden');

            updateCounter();
            displayStudents();
            updateStatus();
            
            alert('הסשן נטען בהצלחה!');
        }
    } catch (error) {
        console.error('Error loading session:', error);
        alert('שגיאה בטעינת הסשן: ' + error.message);
    }
}

async function deleteSession(sessionId) {
    if (confirm('האם אתה בטוח שברצונך למחוק את הסשן הזה?')) {
        try {
            await deleteDoc(doc(db, 'sessions', sessionId));
            alert('הסשן נמחק בהצלחה!');
            loadSessions();
        } catch (error) {
            console.error('Error deleting session:', error);
            alert('שגיאה במחיקת הסשן: ' + error.message);
        }
    }
}

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

    currentSessionId = null; // Reset session ID for new session

    document.getElementById('setup-section').classList.add('hidden');
    document.getElementById('teacher-controls').classList.remove('hidden');
    document.getElementById('status').classList.remove('hidden');
    document.getElementById('counter').classList.remove('hidden');
    document.getElementById('students-section').classList.remove('hidden');

    updateCounter();
    displayStudents();
    updateStatus();
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
        if (currentSessionId) {
            saveSession();
        }
        
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

function startCounting() {
    isCountingActive = true;
    updateStatus();
    alert('הספירה החלה! התלמידים יכולים כעת לסמן את עצמם.');
    
    // Auto-save when counting starts
    if (currentSessionId) {
        saveSession();
    }
}

function stopCounting() {
    isCountingActive = false;
    updateStatus();
    
    const presentCount = students.filter(s => s.present).length;
    const totalCount = students.length;
    
    alert(`הספירה הסתיימה!\nנוכחים: ${presentCount} מתוך ${totalCount} תלמידים`);
    
    // Auto-save when counting stops
    if (currentSessionId) {
        saveSession();
    }
}

function resetAttendance() {
    if (confirm('האם אתה בטוח שברצונך לאפס את הנוכחות של כל התלמידים?')) {
        students.forEach(student => student.present = false);
        displayStudents();
        updateCounter();
        alert('הנוכחות אופסה בהצלחה');
        
        // Auto-save when attendance is reset
        if (currentSessionId) {
            saveSession();
        }
    }
}

function newSession() {
    if (confirm('האם אתה בטוח שברצונך להתחיל מחדש? כל הנתונים הנוכחיים יאבדו.')) {
        students = [];
        isCountingActive = false;
        teacherName = '';
        className = '';
        currentSessionId = null;
        
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
    
    if (isCountingActive) {
        statusElement.className = 'status counting pulse';
        statusText.textContent = '🔄 הספירה פעילה - תלמידים יכולים לסמן את עצמם';
    } else {
        statusElement.className = 'status stopped';
        statusText.textContent = '⏸️ הספירה מושהית - ממתין להפעלה';
    }
}

// Load sessions on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, initializing...');
    
    // Check if Firebase is loaded
    if (typeof db === 'undefined') {
        console.error('Firebase not loaded!');
        alert('שגיאה: Firebase לא נטען כראוי. אנא רענן את הדף.');
        return;
    }
    
    console.log('Firebase is loaded, database:', db);
    loadSessions();
});

// עדכון אוטומטי של הזמן
setInterval(() => {
    if (isCountingActive) {
        updateCounter();
    }
}, 1000);