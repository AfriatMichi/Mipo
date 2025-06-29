let students = [];
let isCountingActive = false;
let teacherName = '';
let className = '';
let currentTripId = null;
let currentUser = null;

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
async function autoSaveTrip() {
    if (!currentUser || !teacherName || !className || students.length === 0) {
        return; // Don't save if not ready
    }

    try {
        const tripData = {
            teacherName: teacherName,
            className: className,
            students: students,
            isCountingActive: isCountingActive,
            lastUpdated: new Date(),
            userId: currentUser.uid,
            userEmail: currentUser.email
        };

        if (currentTripId) {
            // Update existing trip
            const tripRef = doc(db, 'sessions', currentTripId);
            await updateDoc(tripRef, {
                ...tripData,
                lastUpdated: new Date()
            });
        } else {
            // Create new trip
            const docRef = await addDoc(collection(db, 'sessions'), {
                ...tripData,
                createdAt: new Date()
            });
            currentTripId = docRef.id;
        }
        
        // Update trips list
        loadTrips();
    } catch (error) {
        console.error('Error auto-saving trip:', error);
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

async function saveTrip() {
    if (!currentUser) {
        showNotification('יש להתחבר כדי לשמור טיול', 'error');
        return;
    }
    
    if (!teacherName || !className || students.length === 0) {
        showNotification('אנא הגדר תלמידים לפני השמירה', 'error');
        return;
    }

    try {
        await autoSaveTrip();
        showNotification('הטיול נשמר בהצלחה', 'success');
    } catch (error) {
        console.error('Error saving trip:', error);
        showNotification('שגיאה בשמירת הטיול: ' + error.message, 'error');
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

        // Query sessions for current user only
        const sessionsQuery = query(collection(db, 'sessions'), where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(sessionsQuery);
        
        sessionsList.innerHTML = '';

        let userSessions = [];
        querySnapshot.forEach((doc) => {
            const session = doc.data();
            userSessions.push({ id: doc.id, data: session });
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
            currentTripId = sessionId;

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
                    loadTrips();
                    
                    // Removed automatic loading of most recent trip
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
        loadTrips();
        
        // Removed automatic loading of most recent trip
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
        loadTrips();
        
        // Removed automatic loading of most recent trip
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
        loadTrips();
        
        // For new users, there won't be any trips to load
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
        teacherName = '';
        className = '';
        currentTripId = null;
        
        // Hide sessions section
        document.getElementById('sessions-section').classList.add('hidden');
        
        // Show setup section
        document.getElementById('setup-section').classList.remove('hidden');
        document.getElementById('teacher-controls').classList.add('hidden');
        document.getElementById('status').classList.add('hidden');
        document.getElementById('counter').classList.add('hidden');
        document.getElementById('students-section').classList.add('hidden');
        
        // Clear form fields
        document.getElementById('teacher-name').value = '';
        document.getElementById('class-name').value = '';
        document.getElementById('students-list').value = '';
        
        // Clear students display
        document.getElementById('students-container').innerHTML = '';
        
        // Reset counter
        document.getElementById('counter').textContent = '0';
        
        showNotification('התנתקת בהצלחה', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('שגיאה בהתנתקות: ' + error.message, 'error');
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

async function loadTrips() {
    if (!currentUser) {
        document.getElementById('sessions-list').innerHTML = '<p>יש להתחבר כדי לראות טיולים</p>';
        return;
    }
    
    try {
        const sessionsList = document.getElementById('sessions-list');
        sessionsList.innerHTML = '<p>טוען טיולים...</p>';

        // Query trips for current user only
        const tripsQuery = query(collection(db, 'sessions'), where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(tripsQuery);
        
        sessionsList.innerHTML = '';

        let userTrips = [];
        querySnapshot.forEach((doc) => {
            const trip = doc.data();
            userTrips.push({ id: doc.id, data: trip });
        });

        if (userTrips.length === 0) {
            sessionsList.innerHTML = '<p>אין טיולים שמורים</p>';
            return;
        }

        userTrips.forEach(({ id, data: trip }) => {
            const tripDiv = document.createElement('div');
            tripDiv.className = 'session-item';
            tripDiv.style.cssText = `
                background: white;
                border: 2px solid #ddd;
                border-radius: 10px;
                padding: 15px;
                margin: 10px 0;
                cursor: pointer;
                transition: all 0.3s;
            `;
            
            tripDiv.innerHTML = `
                <h3>${trip.teacherName} - ${trip.className}</h3>
                <p>תלמידים: ${trip.students.length}</p>
                <p>נוכחים: ${trip.students.filter(s => s.present).length}</p>
                <p>נוצר: ${trip.createdAt.toDate().toLocaleString('he-IL')}</p>
                <button class="btn" onclick="loadTrip('${id}')" style="margin: 5px;">📂 טען</button>
                <button class="btn btn-danger" onclick="deleteTrip('${id}')" style="margin: 5px;">🗑️ מחק</button>
            `;
            
            tripDiv.onmouseover = () => {
                tripDiv.style.transform = 'translateY(-2px)';
                tripDiv.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
            };
            
            tripDiv.onmouseout = () => {
                tripDiv.style.transform = 'translateY(0)';
                tripDiv.style.boxShadow = 'none';
            };
            
            sessionsList.appendChild(tripDiv);
        });
    } catch (error) {
        console.error('Error loading trips:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            user: currentUser?.uid,
            email: currentUser?.email
        });
        
        let errorMessage = 'שגיאה בטעינת טיולים';
        
        if (error.code === 'permission-denied') {
            errorMessage = 'אין הרשאה לטעון טיולים. אנא ודא שאתה מחובר.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'שירות Firestore לא זמין כרגע. אנא נסה שוב מאוחר יותר.';
        } else if (error.code === 'unauthenticated') {
            errorMessage = 'יש להתחבר מחדש כדי לטעון טיולים.';
        }
        
        document.getElementById('sessions-list').innerHTML = `<p style="color: red;">${errorMessage}</p>`;
        showNotification(errorMessage, 'error');
    }
}

async function loadTrip(tripId) {
    if (!currentUser) {
        alert('יש להתחבר כדי לטעון טיול');
        return;
    }
    
    try {
        const tripRef = doc(db, 'sessions', tripId);
        const tripDoc = await getDocs(collection(db, 'sessions'));
        
        let tripData = null;
        tripDoc.forEach((doc) => {
            if (doc.id === tripId) {
                tripData = doc.data();
            }
        });

        if (tripData) {
            // Check if trip belongs to current user
            if (tripData.userId !== currentUser.uid) {
                alert('אין לך הרשאה לטעון טיול זה');
                return;
            }
            
            teacherName = tripData.teacherName;
            className = tripData.className;
            students = tripData.students;
            isCountingActive = tripData.isCountingActive;
            currentTripId = tripId;

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
        console.error('Error loading trip:', error);
        alert('שגיאה בטעינת הטיול: ' + error.message);
    }
}

async function deleteTrip(tripId) {
    if (!currentUser) {
        showNotification('יש להתחבר כדי למחוק טיול', 'error');
        return;
    }
    
    if (confirm('האם אתה בטוח שברצונך למחוק את הטיול הזה?')) {
        try {
            // First check if trip belongs to current user
            const tripDoc = await getDocs(collection(db, 'sessions'));
            let tripData = null;
            tripDoc.forEach((doc) => {
                if (doc.id === tripId) {
                    tripData = doc.data();
                }
            });
            
            if (tripData && tripData.userId !== currentUser.uid) {
                showNotification('אין לך הרשאה למחוק טיול זה', 'error');
                return;
            }
            
            await deleteDoc(doc(db, 'sessions', tripId));
            showNotification('הטיול נמחק בהצלחה', 'success');
            loadTrips();
        } catch (error) {
            console.error('Error deleting trip:', error);
            showNotification('שגיאה במחיקת הטיול: ' + error.message, 'error');
        }
    }
}