// Trip management functions
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