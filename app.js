// Enhanced Authentication Functions
async function registerUser(username, email, password, securityQuestion, securityAnswer) {
  try {
    // Create user with email/password
    const userCredential = await window.firebaseUtils.createUserWithEmailAndPassword(
      window.firebaseAuth, 
      email, 
      password
    );
    
    const user = userCredential.user;
    
    // Store additional user data in Firestore
    await window.firebaseUtils.setDoc(
      window.firebaseUtils.doc(window.firebaseDB, 'users', user.uid),
      {
        username: username,
        email: email,
        securityQuestion: securityQuestion,
        securityAnswer: securityAnswer,
        profilePicture: '',
        theme: 'professional',
        joinDate: new Date().toISOString(),
        createdAt: new Date()
      }
    );

    // Initialize empty transactions
    await window.firebaseUtils.setDoc(
      window.firebaseUtils.doc(window.firebaseDB, 'userData', user.uid),
      {
        transactions: [],
        settings: {},
        lastUpdated: new Date()
      }
    );

    return { success: true, user: user };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
}

async function loginUser(email, password) {
  try {
    const userCredential = await window.firebaseUtils.signInWithEmailAndPassword(
      window.firebaseAuth,
      email,
      password
    );
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// Data Management Functions
async function saveTransaction(transaction) {
  const user = window.firebaseAuth.currentUser;
  if (!user) return { success: false, error: 'User not logged in' };

  try {
    // Get current user data
    const userDataRef = window.firebaseUtils.doc(window.firebaseDB, 'userData', user.uid);
    const userDataDoc = await window.firebaseUtils.getDoc(userDataRef);
    
    let userData = userDataDoc.exists() ? userDataDoc.data() : { transactions: [] };
    
    // Add new transaction
    transaction.id = Date.now().toString();
    transaction.timestamp = new Date();
    userData.transactions.push(transaction);
    userData.lastUpdated = new Date();

    // Save back to Firestore
    await window.firebaseUtils.setDoc(userDataRef, userData);
    
    return { success: true };
  } catch (error) {
    console.error('Save transaction error:', error);
    return { success: false, error: error.message };
  }
}

async function loadUserData() {
  const user = window.firebaseAuth.currentUser;
  if (!user) return null;

  try {
    const userDataRef = window.firebaseUtils.doc(window.firebaseDB, 'userData', user.uid);
    const userDataDoc = await window.firebaseUtils.getDoc(userDataRef);
    
    if (userDataDoc.exists()) {
      return userDataDoc.data();
    } else {
      // Initialize empty data
      const emptyData = { transactions: [], settings: {}, lastUpdated: new Date() };
      await window.firebaseUtils.setDoc(userDataRef, emptyData);
      return emptyData;
    }
  } catch (error) {
    console.error('Load user data error:', error);
    return null;
  }
}

// Real-time Synchronization
function setupRealtimeSync() {
  const user = window.firebaseAuth.currentUser;
  if (!user) return;

  const userDataRef = window.firebaseUtils.doc(window.firebaseDB, 'userData', user.uid);
  
  // Listen for real-time changes
  window.firebaseUtils.onSnapshot(userDataRef, (doc) => {
    if (doc.exists()) {
      const userData = doc.data();
      // Update UI with new data
      updateDashboard(userData.transactions);
      console.log('Data synced from server:', userData);
    }
  });
}

// Authentication State Listener
window.firebaseUtils.onAuthStateChanged(window.firebaseAuth, async (user) => {
  if (user) {
    console.log('User signed in:', user.email);
    // Load user data and set up real-time sync
    const userData = await loadUserData();
    setupRealtimeSync();
    showDashboard();
  } else {
    console.log('User signed out');
    showAuthScreen();
  }
});
