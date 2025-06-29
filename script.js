let students = [];
let isCountingActive = false;
let teacherName = '';
let className = '';
let currentSessionId = null;
let currentUser = null;

// Function to debug authentication state
function debugAuth() {
    if (!window.auth) {
        showNotification('Firebase לא נטען עדיין', 'error');
        return;
    }
    
    console.log('=== AUTH DEBUG INFO ===');
    console.log('currentUser:', currentUser);
    console.log('auth.currentUser:', auth.currentUser);
    console.log('auth.currentUser?.uid:', auth.currentUser?.uid);
    console.log('auth.currentUser?.email:', auth.currentUser?.email);
    console.log('auth.currentUser?.emailVerified:', auth.currentUser?.emailVerified);
    console.log('auth.currentUser?.providerData:', auth.currentUser?.providerData);
    
    if (currentUser) {
        showNotification(`מחובר: ${currentUser.email} (${currentUser.uid})`, 'info');
    } else {
        showNotification('לא מחובר', 'error');
    }
}

// Function to refresh authentication and permissions
async function refreshAuth() {
    if (!window.auth) {
        showNotification('Firebase לא נטען עדיין', 'error');
        return;
    }
    
    try {
        showNotification('מרענן הרשאות...', 'info');
        
        // Force re-authentication check
        await auth.currentUser?.reload();
        
        // Reload sessions
        await loadSessions();
        
        showNotification('ההרשאות רועננו בהצלחה', 'success');
    } catch (error) {
        console.error('Error refreshing auth:', error);
        showNotification('שגיאה ברענון ההרשאות. אנא התחבר מחדש.', 'error');
        
        // If refresh fails, redirect to login
        setTimeout(() => {
            logout();
        }, 2000);
    }
}

// Function to check if user has proper permissions
async function checkPermissions() {
    if (!window.auth || !window.db) {
        console.log('Firebase not ready yet');
        return;
    }
    
    try {
        console.log('Checking permissions for user:', currentUser?.uid, currentUser?.email);
        console.log('Auth state:', auth.currentUser);
        
        // Try to read from sessions collection to test permissions
        const sessionsQuery = query(collection(db, 'sessions'), where('userId', '==', currentUser.uid));
        const testQuery = await getDocs(sessionsQuery);
        console.log('Permissions check passed');
    } catch (error) {
        console.error('Permissions check failed:', error);
        console.error('Auth details:', {
            currentUser: currentUser?.uid,
            authUser: auth.currentUser?.uid,
            isAuthenticated: !!auth.currentUser
        });
        
        if (error.code === 'permission-denied') {
            showNotification('בעיית הרשאות זוהתה. לחץ על "רענן הרשאות"', 'warning');
        }
    }
}

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

// Firebase functions
async function autoSaveSession() {
    if (!currentUser || !teacherName || !className || students.length === 0) {
        return; // Don't save if not ready
    }

    try {
        const sessionData = {
            teacherName: teacherName,
            className: className,
            students: students,
            isCountingActive: isCountingActive,
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
        } else {
            // Create new session
            const docRef = await addDoc(collection(db, 'sessions'), {
                ...sessionData,
                createdAt: new Date()
            });
            currentSessionId = docRef.id;
        }
        
        // Update sessions list
        loadSessions();
    } catch (error) {
        console.error('Error auto-saving session:', error);
        let errorMessage = 'שגיאה בשמירה אוטומטית';
        
        if (error.code === 'permission-denied') {
            errorMessage = 'אין הרשאה לשמור. אנא ודא שאתה מחובר.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'שירות Firestore לא זמין כרגע. הנתונים לא נשמרו.';
        } else if (error.code === 'unauthenticated') {
            errorMessage = 'יש להתחבר מחדש כדי לשמור.';
        }
        
        showNotification(errorMessage, 'error');
    }
}

async function saveSession() {
    if (!currentUser) {
        showNotification('יש להתחבר כדי לשמור סשן', 'error');
        return;
    }
    
    if (!teacherName || !className || students.length === 0) {
        showNotification('אנא הגדר תלמידים לפני השמירה', 'error');
        return;
    }

    try {
        await autoSaveSession();
        showNotification('הסשן נשמר בהצלחה', 'success');
    } catch (error) {
        console.error('Error saving session:', error);
        showNotification('שגיאה בשמירת הסשן: ' + error.message, 'error');
    }
}

async function loadSessions() {
    if (!currentUser) {
        document.getElementById('sessions-list').innerHTML = '<p>יש להתחבר כדי לראות סשנים</p>';
        return;
    }
    
    console.log('Loading sessions for user:', currentUser.uid, currentUser.email);
    
    try {
        const sessionsList = document.getElementById('sessions-list');
        sessionsList.innerHTML = '<p>טוען סשנים...</p>';

        // Query sessions for current user only
        const sessionsQuery = query(collection(db, 'sessions'), where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(sessionsQuery);
        
        sessionsList.innerHTML = '';

        let userSessions = [];
        querySnapshot.forEach((doc) => {
            const session = doc.data();
            console.log('Found session:', doc.id, session.userId, session.teacherName);
            userSessions.push({ id: doc.id, data: session });
        });

        console.log('User sessions found:', userSessions.length);

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
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            user: currentUser?.uid,
            email: currentUser?.email
        });
        
        let errorMessage = 'שגיאה בטעינת סשנים';
        
        if (error.code === 'permission-denied') {
            errorMessage = 'אין הרשאה לטעון סשנים. אנא ודא שאתה מחובר.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'שירות Firestore לא זמין כרגע. אנא נסה שוב מאוחר יותר.';
        } else if (error.code === 'unauthenticated') {
            errorMessage = 'יש להתחבר מחדש כדי לטעון סשנים.';
        }
        
        document.getElementById('sessions-list').innerHTML = `<p style="color: red;">${errorMessage}</p>`;
        showNotification(errorMessage, 'error');
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
        }
    } catch (error) {
        console.error('Error loading session:', error);
        alert('שגיאה בטעינת הסשן: ' + error.message);
    }
}

async function deleteSession(sessionId) {
    if (!currentUser) {
        showNotification('יש להתחבר כדי למחוק סשן', 'error');
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
                showNotification('אין לך הרשאה למחוק סשן זה', 'error');
                return;
            }
            
            await deleteDoc(doc(db, 'sessions', sessionId));
            showNotification('הסשן נמחק בהצלחה', 'success');
            loadSessions();
        } catch (error) {
            console.error('Error deleting session:', error);
            showNotification('שגיאה במחיקת הסשן: ' + error.message, 'error');
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
    
    // Auto-save the new session
    autoSaveSession();
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
        autoSaveSession();
        
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
    
    // Auto-save when counting starts
    autoSaveSession();
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
    autoSaveSession();
}

function resetAttendance() {
    if (confirm('האם אתה בטוח שברצונך לאפס את הנוכחות של כל התלמידים?')) {
        students.forEach(student => student.present = false);
        displayStudents();
        updateCounter();
        
        // Auto-save when attendance is reset
        autoSaveSession();
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
    const autoSaveIndicator = document.getElementById('auto-save-indicator');
    
    if (isCountingActive) {
        statusElement.className = 'status counting pulse';
        statusText.textContent = '🔄 הספירה פעילה - תלמידים יכולים לסמן את עצמם';
    } else {
        statusElement.className = 'status stopped';
        statusText.textContent = '⏸️ הספירה מושהית - ממתין להפעלה';
    }
    
    // Show auto-save indicator only if there's an active session
    if (currentSessionId && teacherName && className && students.length > 0) {
        autoSaveIndicator.style.display = 'block';
    } else {
        autoSaveIndicator.style.display = 'none';
    }
}

// Load sessions on page load
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
                    loadSessions();
                    
                    // Try to load the most recent session
                    setTimeout(() => {
                        loadMostRecentSession(true); // Silent mode for automatic loading
                    }, 1000); // Small delay to ensure sessions are loaded first
                    
                    // Check permissions after a short delay
                    setTimeout(() => {
                        checkPermissions();
                    }, 2000);
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
        autoSaveSession();
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
    if (currentUser && currentSessionId && teacherName && className && students.length > 0) {
        autoSaveSession();
    }
}, 30000);

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
        
        // Try to load the most recent session
        setTimeout(() => {
            loadMostRecentSession(true); // Silent mode for automatic loading
        }, 1000); // Small delay to ensure sessions are loaded first
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
        
        // Try to load the most recent session
        setTimeout(() => {
            loadMostRecentSession(true); // Silent mode for automatic loading
        }, 1000); // Small delay to ensure sessions are loaded first
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
        
        // For new users, there won't be any sessions to load, so we don't call loadMostRecentSession
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
        
        // Hide sessions section
        document.getElementById('sessions-section').classList.add('hidden');
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

async function loadMostRecentSession(silent = false) {
    if (!currentUser) {
        if (!silent) {
            showNotification('יש להתחבר כדי לטעון סשן', 'error');
        }
        return;
    }
    
    try {
        // Query sessions for current user only
        const sessionsQuery = query(collection(db, 'sessions'), where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(sessionsQuery);
        
        let userSessions = [];
        querySnapshot.forEach((doc) => {
            const session = doc.data();
            userSessions.push({ id: doc.id, data: session });
        });

        if (userSessions.length === 0) {
            if (!silent) {
                showNotification('אין סשנים שמורים לטעינה', 'info');
            }
            return; // No sessions to load
        }

        // Sort by creation date (most recent first)
        userSessions.sort((a, b) => {
            const dateA = a.data.createdAt.toDate();
            const dateB = b.data.createdAt.toDate();
            return dateB - dateA;
        });

        // Load the most recent session
        const mostRecentSession = userSessions[0];
        await loadSession(mostRecentSession.id);
        
        if (!silent) {
            showNotification('הסשן האחרון נטען בהצלחה', 'success');
        }
    } catch (error) {
        console.error('Error loading most recent session:', error);
        let errorMessage = 'שגיאה בטעינת הסשן האחרון';
        
        if (error.code === 'permission-denied') {
            errorMessage = 'אין הרשאה לטעון סשנים. אנא ודא שאתה מחובר.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'שירות Firestore לא זמין כרגע. אנא נסה שוב מאוחר יותר.';
        } else if (error.code === 'unauthenticated') {
            errorMessage = 'יש להתחבר מחדש כדי לטעון סשנים.';
        }
        
        if (!silent) {
            showNotification(errorMessage, 'error');
        }
    }
}