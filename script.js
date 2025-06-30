let students = [];
let isCountingActive = false;
let teacherName = '';
let className = '';
let currentSessionId = null;
let currentUser = null;

// Firebase functions
async function saveSession() {
    if (!currentUser) {
        alert('יש להתחבר כדי לשמור סשן');
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
            lastUpdated: new Date(),
            userId: currentUser.uid,
            userEmail: currentUser.email
        };

        if (currentSessionId) {
            // Update existing session
            const sessionRef = doc(db, 'sessions', currentSessionId);
            await updateDoc(sessionRef, {
                ...sessionData,
                lastUpdated: new Date()
            });
            alert('הסשן עודכן בהצלחה!');
        } else {
            // Create new session
            const docRef = await addDoc(collection(db, 'sessions'), sessionData);
            currentSessionId = docRef.id;
            alert('הסשן נשמר בהצלחה!');
        }
        
        loadSessions();
    } catch (error) {
        console.error('Error saving session:', error);
        alert('שגיאה בשמירת הסשן: ' + error.message);
    }
}

async function loadSessions() {
    if (!currentUser) {
        document.getElementById('sessions-list').innerHTML = '<p>יש להתחבר כדי לראות סשנים</p>';
        return;
    }
    
    try {
        const sessionsList = document.getElementById('sessions-list');
        sessionsList.innerHTML = '<p>טוען סשנים...</p>';

        const querySnapshot = await getDocs(collection(db, 'sessions'));
        sessionsList.innerHTML = '';

        let userSessions = [];
        querySnapshot.forEach((doc) => {
            const session = doc.data();
            // Only show sessions belonging to current user
            if (session.userId === currentUser.uid) {
                userSessions.push({ id: doc.id, data: session });
            }
        });

        if (userSessions.length === 0) {
            sessionsList.innerHTML = '<p>אין סשנים שמורים</p>';
            return;
        }

        userSessions.forEach(({ id, data: session }) => {
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
                <button class="btn" onclick="loadSession('${id}')" style="margin: 5px;">📂 טען</button>
                <button class="btn btn-danger" onclick="deleteSession('${id}')" style="margin: 5px;">🗑️ מחק</button>
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
        document.getElementById('sessions-list').innerHTML = '<p>שגיאה בטעינת סשנים</p>';
    }
}

async function loadSession(sessionId) {
    if (!currentUser) {
        alert('יש להתחבר כדי לטעון סשן');
        return;
    }
    
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
            // Check if session belongs to current user
            if (sessionData.userId !== currentUser.uid) {
                alert('אין לך הרשאה לטעון סשן זה');
                return;
            }
            
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
    if (!currentUser) {
        alert('יש להתחבר כדי למחוק סשן');
        return;
    }
    
    if (confirm('האם אתה בטוח שברצונך למחוק את הסשן הזה?')) {
        try {
            // First check if session belongs to current user
            const sessionDoc = await getDocs(collection(db, 'sessions'));
            let sessionData = null;
            sessionDoc.forEach((doc) => {
                if (doc.id === sessionId) {
                    sessionData = doc.data();
                }
            });
            
            if (sessionData && sessionData.userId !== currentUser.uid) {
                alert('אין לך הרשאה למחוק סשן זה');
                return;
            }
            
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
    // Authentication state will be checked by onAuthStateChanged
    // and sessions will be loaded automatically if user is logged in
});

// עדכון אוטומטי של הזמן
setInterval(() => {
    if (isCountingActive) {
        updateCounter();
    }
}, 1000);

// Authentication functions
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

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        alert('אנא מלא את כל השדות');
        return;
    }
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        showMainApp();
        updateUserUI();
        loadSessions();
    } catch (error) {
        console.error('Login error:', error);
        alert('שגיאה בהתחברות: ' + error.message);
    }
}

async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        currentUser = result.user;
        showMainApp();
        updateUserUI();
        loadSessions();
    } catch (error) {
        console.error('Google login error:', error);
        alert('שגיאה בהתחברות עם Google: ' + error.message);
    }
}

async function register() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    
    if (!email || !password || !confirmPassword) {
        alert('אנא מלא את כל השדות');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('הסיסמאות אינן תואמות');
        return;
    }
    
    if (password.length < 6) {
        alert('הסיסמה חייבת להיות לפחות 6 תווים');
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        showMainApp();
        updateUserUI();
        loadSessions();
        alert('ההרשמה הושלמה בהצלחה!');
    } catch (error) {
        console.error('Registration error:', error);
        alert('שגיאה בהרשמה: ' + error.message);
    }
}

async function logout() {
    try {
        await signOut(auth);
        currentUser = null;
        showLoginForm();
        updateUserUI();
        // Reset all data
        students = [];
        isCountingActive = false;
        teacherName = '';
        className = '';
        currentSessionId = null;
    } catch (error) {
        console.error('Logout error:', error);
        alert('שגיאה בהתנתקות: ' + error.message);
    }
}

function updateUserUI() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    
    if (currentUser) {
        loginBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        userInfo.classList.remove('hidden');
        userName.textContent = currentUser.email || currentUser.displayName || 'משתמש';
    } else {
        loginBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        userInfo.classList.add('hidden');
        userName.textContent = '';
    }
}

// Check authentication state on page load
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateUserUI();
    
    if (user) {
        showMainApp();
        loadSessions();
    } else {
        showLoginForm();
    }
});