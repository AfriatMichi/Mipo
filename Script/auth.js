// Authentication functions
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
        
        // Clear form fields
        document.getElementById('teacher-name').value = '';
        document.getElementById('class-name').value = '';
        document.getElementById('students-list').value = '';
        
        // Clear students display
        const studentsGrid = document.getElementById('students-grid');
        if (studentsGrid) studentsGrid.innerHTML = '';
        
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