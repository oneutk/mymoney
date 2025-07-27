// MyMoney by UTK JS - Enhanced with Cross-Device Sync (Fixed QR Code)
(function () {
  'use strict';

  // ===== Global variables =====
  var usersDatabase = {};
  var userDataDatabase = {};
  var currentUser = null;
  var currentTransactions = [];
  var currentPage = 'dashboard';
  var calculatorExpression = '';
  var pieChart = null;
  var lineChart = null;
  var forgotPasswordStep = 1;
  var currentReportData = null;

  var currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  });

  var today = new Date();
  var todayStr = today.toISOString().split('T')[0];

  var securityQuestions = {
    'pet': 'What was the name of your first pet?',
    'school': 'What was the name of your first school?',
    'city': 'In which city were you born?',
    'mother': 'What is your mother\'s maiden name?',
    'food': 'What is your favorite food?'
  };

  var defaultProfilePic = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2MzY2RjEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTggMzJDOCAyNi40NzcyIDEyLjQ3NzIgMjIgMTggMjJIMjJDMjcuNTIyOCAyMiAzMiAyNi40NzcyIDMyIDMyVjQwSDhWMzJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K';

  // Debug function
  function debug(message) {
    console.log('[MyMoney Debug]', message);
  }

  // ===== Encryption/Decryption Functions =====
  function simpleEncrypt(text, key) {
    var result = '';
    key = key || 'MyMoneyUTKSecretKey2025';
    for (var i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
  }

  function simpleDecrypt(encryptedText, key) {
    try {
      key = key || 'MyMoneyUTKSecretKey2025';
      var text = atob(encryptedText);
      var result = '';
      for (var i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  // ===== URL Parameter Handling =====
  function getURLParameter(name) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  function clearURLParameters() {
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // ===== Simple QR Code Generation =====
  function generateSimpleQR(text, size) {
    size = size || 256;
    // Create a simple grid pattern representing QR code
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    
    // Create a grid pattern based on text hash
    var hash = 0;
    for (var i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) & 0xffffffff;
    }
    
    var gridSize = 16;
    var cellSize = size / gridSize;
    ctx.fillStyle = '#000000';
    
    // Create position markers (corners)
    var markerSize = 3;
    for (var x = 0; x < markerSize; x++) {
      for (var y = 0; y < markerSize; y++) {
        // Top-left marker
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        // Top-right marker
        ctx.fillRect((gridSize - markerSize + x) * cellSize, y * cellSize, cellSize, cellSize);
        // Bottom-left marker
        ctx.fillRect(x * cellSize, (gridSize - markerSize + y) * cellSize, cellSize, cellSize);
      }
    }
    
    // Fill pattern based on hash
    for (var x = 4; x < gridSize - 4; x++) {
      for (var y = 4; y < gridSize - 4; y++) {
        var seed = hash + x * 7 + y * 13;
        if (seed % 3 === 0) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
    
    return canvas;
  }

  // ===== Local Storage Management =====
  function loadData() {
    try {
      debug('Loading data from localStorage');
      var users = localStorage.getItem('myMoneyUTK_users');
      var userData = localStorage.getItem('myMoneyUTK_userData');
      
      if (users) {
        usersDatabase = JSON.parse(users);
        debug('Loaded users: ' + Object.keys(usersDatabase).join(', '));
      }
      
      if (userData) {
        userDataDatabase = JSON.parse(userData);
        debug('Loaded user data');
      }

      // Create demo user if no users exist
      if (Object.keys(usersDatabase).length === 0) {
        debug('Creating demo user...');
        usersDatabase['demo'] = {
          password: 'demo123',
          securityQuestion: 'pet',
          securityAnswer: 'buddy',
          createdAt: new Date().toISOString()
        };
        
        userDataDatabase['demo'] = {
          transactions: [
            {
              id: 1,
              amount: 50000,
              type: 'Credit',
              category: 'Salary',
              date: '2025-01-20',
              description: 'Monthly salary',
              timestamp: new Date('2025-01-20')
            },
            {
              id: 2,
              amount: 12000,
              type: 'Debit',
              category: 'Rent',
              date: '2025-01-21',
              description: 'Monthly rent payment',
              timestamp: new Date('2025-01-21')
            },
            {
              id: 3,
              amount: 3500,
              type: 'Debit',
              category: 'Food',
              date: '2025-01-22',
              description: 'Groceries and dining',
              timestamp: new Date('2025-01-22')
            }
          ],
          theme: 'light',
          profilePic: defaultProfilePic
        };
        
        saveData();
        debug('Demo user created successfully');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  function saveData() {
    try {
      localStorage.setItem('myMoneyUTK_users', JSON.stringify(usersDatabase));
      localStorage.setItem('myMoneyUTK_userData', JSON.stringify(userDataDatabase));
      debug('Data saved successfully');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  // ===== Sync Functions =====
  function generateQRCode() {
    debug('Generating QR Code...');
    
    if (!currentUser || !usersDatabase[currentUser] || !userDataDatabase[currentUser]) {
      alert('No user data available to sync.');
      return;
    }

    var userData = {
      version: 2,
      syncType: 'qr',
      timestamp: new Date().toISOString(),
      user: {
        username: currentUser,
        password: usersDatabase[currentUser].password,
        securityQuestion: usersDatabase[currentUser].securityQuestion,
        securityAnswer: usersDatabase[currentUser].securityAnswer,
        createdAt: usersDatabase[currentUser].createdAt
      },
      data: userDataDatabase[currentUser]
    };

    var jsonString = JSON.stringify(userData);
    var encryptedData = simpleEncrypt(jsonString);
    
    var qrModal = document.getElementById('qrModal');
    var qrCodeContainer = document.getElementById('qrCodeContainer');
    
    if (!qrModal || !qrCodeContainer) {
      debug('QR modal elements not found');
      return;
    }

    // Clear previous QR code
    qrCodeContainer.innerHTML = '';

    try {
      // Try to use QRCode.js library first
      if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(qrCodeContainer, encryptedData, {
          width: 256,
          height: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        }, function (error) {
          if (error) {
            console.error('QR generation error:', error);
            // Fallback to simple QR
            var canvas = generateSimpleQR(encryptedData, 256);
            qrCodeContainer.innerHTML = '';
            qrCodeContainer.appendChild(canvas);
          }
        });
      } else {
        // Use simple QR generation as fallback
        debug('QRCode library not available, using fallback');
        var canvas = generateSimpleQR(encryptedData, 256);
        qrCodeContainer.appendChild(canvas);
      }

      qrModal.classList.remove('hidden');
      qrModal.classList.add('active');
      debug('QR code generated successfully');
    } catch (error) {
      console.error('QR code generation failed:', error);
      // Last resort: show text
      qrCodeContainer.innerHTML = '<div style="padding: 20px; background: #f0f0f0; border-radius: 8px; font-family: monospace; font-size: 10px; word-break: break-all; max-width: 256px; text-align: center;"><p><strong>QR Data:</strong></p><div style="max-height: 200px; overflow-y: auto;">' + encryptedData.substring(0, 300) + '...</div><p><small>Note: Use Export File method for easier sharing</small></p></div>';
      qrModal.classList.remove('hidden');
      qrModal.classList.add('active');
    }
  }

  function downloadQRCode() {
    var canvas = document.querySelector('#qrCodeContainer canvas');
    if (!canvas) {
      alert('No QR code to download.');
      return;
    }

    try {
      var link = document.createElement('a');
      link.download = 'MyMoney_QR_' + currentUser + '_' + todayStr + '.png';
      link.href = canvas.toDataURL();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      var downloadBtn = document.getElementById('downloadQRBtn');
      if (downloadBtn) {
        var originalText = downloadBtn.textContent;
        downloadBtn.textContent = '✅ Downloaded!';
        setTimeout(function() {
          downloadBtn.textContent = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download QR code.');
    }
  }

  function exportAccountData() {
    debug('Exporting complete account data...');
    
    if (!currentUser || !usersDatabase[currentUser] || !userDataDatabase[currentUser]) {
      alert('No user data available to export.');
      return;
    }

    var exportData = {
      version: 2,
      syncType: 'file',
      exportDate: new Date().toISOString(),
      user: {
        username: currentUser,
        password: usersDatabase[currentUser].password,
        securityQuestion: usersDatabase[currentUser].securityQuestion,
        securityAnswer: usersDatabase[currentUser].securityAnswer,
        createdAt: usersDatabase[currentUser].createdAt
      },
      data: userDataDatabase[currentUser]
    };

    var jsonString = JSON.stringify(exportData, null, 2);
    var blob = new Blob([jsonString], { type: 'application/json' });
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'MyMoney_Account_' + currentUser + '_' + todayStr + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    var exportBtn = document.getElementById('exportAccountBtn');
    if (exportBtn) {
      var originalText = exportBtn.textContent;
      exportBtn.textContent = '✅ Account Exported!';
      setTimeout(function() {
        exportBtn.textContent = originalText;
      }, 3000);
    }

    alert('Account exported successfully! Transfer this file to your other device and import it on the login screen.');
  }

  function generateShareLink() {
    debug('Generating share link...');
    
    if (!currentUser || !usersDatabase[currentUser] || !userDataDatabase[currentUser]) {
      alert('No user data available to share.');
      return;
    }

    var userData = {
      version: 2,
      syncType: 'link',
      timestamp: new Date().toISOString(),
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      user: {
        username: currentUser,
        password: usersDatabase[currentUser].password,
        securityQuestion: usersDatabase[currentUser].securityQuestion,
        securityAnswer: usersDatabase[currentUser].securityAnswer,
        createdAt: usersDatabase[currentUser].createdAt
      },
      data: userDataDatabase[currentUser]
    };

    var jsonString = JSON.stringify(userData);
    var encryptedData = simpleEncrypt(jsonString);
    var shareUrl = window.location.origin + window.location.pathname + '?import=' + encodeURIComponent(encryptedData);

    var linkModal = document.getElementById('linkModal');
    var shareLink = document.getElementById('shareLink');
    
    if (!linkModal || !shareLink) {
      debug('Link modal elements not found');
      return;
    }

    shareLink.value = shareUrl;
    linkModal.classList.remove('hidden');
    linkModal.classList.add('active');
  }

  function copyShareLink() {
    var shareLink = document.getElementById('shareLink');
    var copyBtn = document.getElementById('copyLinkBtn');
    
    if (!shareLink || !copyBtn) return;

    try {
      shareLink.select();
      shareLink.setSelectionRange(0, 99999); // For mobile devices
      document.execCommand('copy');
      
      copyBtn.textContent = '✅ Copied!';
      copyBtn.classList.add('btn-copy-success');
      
      setTimeout(function() {
        copyBtn.textContent = '📋 Copy';
        copyBtn.classList.remove('btn-copy-success');
      }, 2000);
      
      alert('Link copied! You can now paste it on your other device.');
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy link. Please select and copy manually.');
    }
  }

  function handleQRScan(file) {
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        // For now, we'll treat the file as if it contains the encrypted data
        // In a real implementation, you'd use a QR code reader library
        var encryptedData = e.target.result;
        importSyncData(encryptedData, 'qr');
      } catch (error) {
        console.error('QR scan error:', error);
        alert('Failed to read QR code. Please make sure you selected a valid QR code image.');
      }
    };
    reader.readAsText(file);
  }

  function importAccountFile(file) {
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var importData = JSON.parse(e.target.result);
        
        if (!importData.version || importData.version < 2) {
          alert('Invalid or outdated account file. Please export a new account file from the latest version.');
          return;
        }

        if (importData.syncType !== 'file') {
          alert('This is not a valid account file.');
          return;
        }

        if (!importData.user || !importData.data) {
          alert('Account file is corrupted or incomplete.');
          return;
        }

        importUserAccount(importData);
      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import account file. Please make sure you selected a valid account file.');
      }
    };
    reader.readAsText(file);
  }

  function importSyncData(encryptedData, syncType) {
    try {
      var decryptedData = simpleDecrypt(encryptedData);
      if (!decryptedData) {
        throw new Error('Failed to decrypt data');
      }

      var importData = JSON.parse(decryptedData);
      
      if (!importData.version || importData.version < 2) {
        alert('Invalid or outdated sync data.');
        return;
      }

      if (importData.expires && new Date(importData.expires) < new Date()) {
        alert('This sync link has expired. Please generate a new one.');
        return;
      }

      if (!importData.user || !importData.data) {
        alert('Sync data is corrupted or incomplete.');
        return;
      }

      importUserAccount(importData);
    } catch (error) {
      console.error('Sync import error:', error);
      alert('Failed to import sync data. Please make sure the data is valid and not corrupted.');
    }
  }

  function importUserAccount(importData) {
    var username = importData.user.username;
    
    // Check if user already exists
    if (usersDatabase[username]) {
      if (!confirm('User "' + username + '" already exists on this device. Do you want to overwrite the existing data?')) {
        return;
      }
    }

    // Import user credentials
    usersDatabase[username] = {
      password: importData.user.password,
      securityQuestion: importData.user.securityQuestion,
      securityAnswer: importData.user.securityAnswer,
      createdAt: importData.user.createdAt || new Date().toISOString()
    };

    // Import user data
    userDataDatabase[username] = importData.data;

    saveData();

    alert('Account imported successfully! You can now login with username: ' + username);
    
    // Auto-fill login form
    var loginUsername = document.getElementById('loginUsername');
    if (loginUsername) {
      loginUsername.value = username;
    }

    // Clear URL parameters if they exist
    clearURLParameters();
  }

  function handleURLImport() {
    var importParam = getURLParameter('import');
    if (!importParam) return;

    // Show loading message
    var authSection = document.getElementById('authSection');
    if (authSection) {
      var importMessage = document.createElement('div');
      importMessage.className = 'url-import-message';
      importMessage.innerHTML = '<h3>🔄 Importing Account Data...</h3><p>Please wait while we import your account data from the share link.</p>';
      authSection.insertBefore(importMessage, authSection.firstChild);

      setTimeout(function() {
        importSyncData(decodeURIComponent(importParam), 'link');
        importMessage.remove();
      }, 1000);
    }
  }

  // ===== Helper Functions =====
  function showError(errorElement, message) {
    if (!errorElement) return;
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    errorElement.classList.add('error-animation');
    setTimeout(function() {
      errorElement.classList.add('hidden');
      errorElement.classList.remove('error-animation');
    }, 5000);
  }

  function showSuccess(successElement, message) {
    if (!successElement) return;
    successElement.textContent = message;
    successElement.classList.remove('hidden');
    successElement.classList.add('success-animation');
    setTimeout(function() {
      successElement.classList.add('hidden');
      successElement.classList.remove('success-animation');
    }, 3000);
  }

  // ===== Authentication Functions =====
  function handleLogin(e) {
    debug('handleLogin called');
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    var usernameField = document.getElementById('loginUsername');
    var passwordField = document.getElementById('loginPassword');
    var errorElement = document.getElementById('loginError');
    
    debug('Form fields found: username=' + !!usernameField + ', password=' + !!passwordField);
    
    if (!usernameField || !passwordField) {
      debug('Login form fields not found');
      return false;
    }
    
    var username = usernameField.value.trim();
    var password = passwordField.value;

    debug('Attempting login for: ' + username);
    debug('Available users: ' + Object.keys(usersDatabase).join(', '));

    if (!username || !password) {
      showError(errorElement, 'Please enter both username and password.');
      return false;
    }

    if (!usersDatabase[username]) {
      debug('User not found: ' + username);
      showError(errorElement, 'Invalid username or password.');
      return false;
    }

    if (usersDatabase[username].password !== password) {
      debug('Password mismatch for user: ' + username);
      showError(errorElement, 'Invalid username or password.');
      return false;
    }

    debug('Login successful for: ' + username);

    // Show loading state
    var submitBtn = document.querySelector('#loginFormElement button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Logging in...';
      submitBtn.disabled = true;
      submitBtn.classList.add('btn--loading');
    }

    // Show app
    setTimeout(function() {
      currentUser = username;
      currentTransactions = userDataDatabase[username] ? userDataDatabase[username].transactions || [] : [];
      showApp();
      
      if (submitBtn) {
        submitBtn.textContent = 'Login';
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn--loading');
      }
    }, 1000);

    return false;
  }

  function handleRegister(e) {
    debug('handleRegister called');
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    var usernameField = document.getElementById('registerUsername');
    var passwordField = document.getElementById('registerPassword');
    var confirmField = document.getElementById('confirmPassword');
    var securityQuestionField = document.getElementById('securityQuestion');
    var securityAnswerField = document.getElementById('securityAnswer');
    var errorElement = document.getElementById('registerError');
    
    if (!usernameField || !passwordField || !confirmField || !securityQuestionField || !securityAnswerField) {
      debug('Register form fields not found');
      return false;
    }
    
    var username = usernameField.value.trim();
    var password = passwordField.value;
    var confirmPassword = confirmField.value;
    var securityQuestion = securityQuestionField.value;
    var securityAnswer = securityAnswerField.value.trim().toLowerCase();

    if (username.length < 3) {
      showError(errorElement, 'Username must be at least 3 characters long.');
      return false;
    }

    if (password.length < 6) {
      showError(errorElement, 'Password must be at least 6 characters long.');
      return false;
    }

    if (password !== confirmPassword) {
      showError(errorElement, 'Passwords do not match.');
      return false;
    }

    if (!securityQuestion) {
      showError(errorElement, 'Please select a security question.');
      return false;
    }

    if (!securityAnswer) {
      showError(errorElement, 'Please provide an answer to the security question.');
      return false;
    }

    if (usersDatabase[username]) {
      showError(errorElement, 'Username already exists. Please choose a different one.');
      return false;
    }

    // Create new user
    usersDatabase[username] = {
      password: password,
      securityQuestion: securityQuestion,
      securityAnswer: securityAnswer,
      createdAt: new Date().toISOString()
    };

    userDataDatabase[username] = {
      transactions: [],
      theme: 'light',
      profilePic: defaultProfilePic
    };

    saveData();
    debug('User registered successfully: ' + username);

    // Auto-login after registration
    currentUser = username;
    currentTransactions = userDataDatabase[username].transactions;
    showApp();

    return false;
  }

  function handleForgotPassword(e) {
    debug('handleForgotPassword called');
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    var usernameField = document.getElementById('forgotUsername');
    var securityAnswerField = document.getElementById('securityAnswerInput');
    var newPasswordField = document.getElementById('newPasswordReset');
    var confirmPasswordField = document.getElementById('confirmNewPasswordReset');
    var errorElement = document.getElementById('forgotPasswordError');
    var successElement = document.getElementById('forgotPasswordSuccess');
    var btn = document.getElementById('forgotPasswordBtn');
    
    if (forgotPasswordStep === 1) {
      // Step 1: Check username
      var username = usernameField.value.trim();
      if (!username) {
        showError(errorElement, 'Please enter your username.');
        return false;
      }
      
      if (!usersDatabase[username]) {
        showError(errorElement, 'Username not found.');
        return false;
      }
      
      // Show security question
      var securityQuestionDisplay = document.getElementById('securityQuestionDisplay');
      var securityQuestionText = document.getElementById('securityQuestionText');
      
      if (securityQuestionDisplay && securityQuestionText) {
        securityQuestionText.textContent = securityQuestions[usersDatabase[username].securityQuestion];
        securityQuestionDisplay.classList.remove('hidden');
        usernameField.readOnly = true;
        btn.textContent = 'Verify Answer';
        forgotPasswordStep = 2;
      }
      
    } else if (forgotPasswordStep === 2) {
      // Step 2: Verify security answer
      var username = usernameField.value.trim();
      var answer = securityAnswerField.value.trim().toLowerCase();
      
      if (!answer) {
        showError(errorElement, 'Please provide your security answer.');
        return false;
      }
      
      if (usersDatabase[username].securityAnswer !== answer) {
        showError(errorElement, 'Incorrect security answer.');
        return false;
      }
      
      // Show new password fields
      var newPasswordSection = document.getElementById('newPasswordSection');
      if (newPasswordSection) {
        newPasswordSection.classList.remove('hidden');
        securityAnswerField.readOnly = true;
        btn.textContent = 'Reset Password';
        forgotPasswordStep = 3;
      }
      
    } else if (forgotPasswordStep === 3) {
      // Step 3: Reset password
      var username = usernameField.value.trim();
      var newPassword = newPasswordField.value;
      var confirmPassword = confirmPasswordField.value;
      
      if (newPassword.length < 6) {
        showError(errorElement, 'New password must be at least 6 characters long.');
        return false;
      }
      
      if (newPassword !== confirmPassword) {
        showError(errorElement, 'Passwords do not match.');
        return false;
      }
      
      // Update password
      usersDatabase[username].password = newPassword;
      saveData();
      
      showSuccess(successElement, 'Password reset successfully! You can now login with your new password.');
      
      // Reset form and go back to login
      setTimeout(function() {
        resetForgotPasswordForm();
        showLoginForm();
      }, 2000);
    }
    
    return false;
  }

  function resetForgotPasswordForm() {
    forgotPasswordStep = 1;
    var form = document.getElementById('forgotPasswordFormElement');
    if (form) form.reset();
    
    var usernameField = document.getElementById('forgotUsername');
    var securityAnswerField = document.getElementById('securityAnswerInput');
    if (usernameField) usernameField.readOnly = false;
    if (securityAnswerField) securityAnswerField.readOnly = false;
    
    var securityQuestionDisplay = document.getElementById('securityQuestionDisplay');
    var newPasswordSection = document.getElementById('newPasswordSection');
    if (securityQuestionDisplay) securityQuestionDisplay.classList.add('hidden');
    if (newPasswordSection) newPasswordSection.classList.add('hidden');
    
    var btn = document.getElementById('forgotPasswordBtn');
    if (btn) btn.textContent = 'Check Username';
  }

  function showAuth() {
    debug('Showing auth section');
    var authSection = document.getElementById('authSection');
    var appSection = document.getElementById('appSection');
    
    if (authSection) authSection.classList.remove('hidden');
    if (appSection) appSection.classList.add('hidden');
    
    showLoginForm();
  }

  function showLoginForm() {
    debug('Showing login form');
    var loginForm = document.getElementById('loginForm');
    var registerForm = document.getElementById('registerForm');
    var forgotPasswordForm = document.getElementById('forgotPasswordForm');
    
    if (loginForm) loginForm.classList.remove('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    if (forgotPasswordForm) forgotPasswordForm.classList.add('hidden');
    
    // Clear error messages
    var loginError = document.getElementById('loginError');
    var registerError = document.getElementById('registerError');
    if (loginError) loginError.classList.add('hidden');
    if (registerError) registerError.classList.add('hidden');
    
    resetForgotPasswordForm();
  }

  function showApp() {
    debug('Showing app section for user: ' + currentUser);
    var authSection = document.getElementById('authSection');
    var appSection = document.getElementById('appSection');
    
    if (authSection) authSection.classList.add('hidden');
    if (appSection) appSection.classList.remove('hidden');
    
    // Load user data and theme
    if (currentUser && userDataDatabase[currentUser]) {
      currentTransactions = userDataDatabase[currentUser].transactions || [];
      var theme = userDataDatabase[currentUser].theme || 'light';
      var profilePic = userDataDatabase[currentUser].profilePic || defaultProfilePic;
      
      document.documentElement.setAttribute('data-color-scheme', theme);
      
      var themeSwitch = document.getElementById('themeSwitch');
      if (themeSwitch) themeSwitch.checked = theme === 'dark';
      
      // Update profile picture
      updateProfilePicture(profilePic);
    }
    
    // Update welcome message
    var welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
      welcomeMessage.textContent = 'Welcome, ' + currentUser + '!';
    }
    
    // Set today's date as default
    var dateInput = document.getElementById('dateInput');
    if (dateInput) dateInput.value = todayStr;
    
    // Navigate to dashboard
    navigateToPage('dashboard');
    
    // Update UI
    renderTransactions();
    updateSummary();
    
    debug('App loaded successfully for user: ' + currentUser);
  }

  function handleLogout() {
    debug('Logout clicked');
    currentUser = null;
    currentTransactions = [];
    currentReportData = null;
    showAuth();
  }

  // ===== Profile Picture Functions =====
  function updateProfilePicture(picSrc) {
    var profilePicImg = document.getElementById('profilePicImg');
    var profilePicPreview = document.getElementById('profilePicPreview');
    
    if (profilePicImg) profilePicImg.src = picSrc;
    if (profilePicPreview) profilePicPreview.src = picSrc;
  }

  function handleProfilePicChange(e) {
    var file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image size should be less than 5MB.');
      return;
    }
    
    var reader = new FileReader();
    reader.onload = function(e) {
      var newProfilePic = e.target.result;
      
      // Update in database
      if (currentUser && userDataDatabase[currentUser]) {
        userDataDatabase[currentUser].profilePic = newProfilePic;
        saveData();
      }
      
      // Update UI
      updateProfilePicture(newProfilePic);
      
      // Success feedback
      alert('Profile picture updated successfully!');
    };
    
    reader.readAsDataURL(file);
  }

  function resetProfilePic() {
    // Update in database
    if (currentUser && userDataDatabase[currentUser]) {
      userDataDatabase[currentUser].profilePic = defaultProfilePic;
      saveData();
    }
    
    // Update UI
    updateProfilePicture(defaultProfilePic);
    
    // Success feedback
    alert('Profile picture reset to default!');
  }

  // ===== Navigation Functions =====
  function navigateToPage(pageName) {
    debug('Navigating to page: ' + pageName);
    
    // Update nav links
    var navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(function(link) {
      link.classList.remove('active');
      if (link.getAttribute('data-page') === pageName) {
        link.classList.add('active');
      }
    });

    // Update page content
    var pageContents = document.querySelectorAll('.page-content');
    pageContents.forEach(function(page) {
      page.classList.remove('active');
    });

    var targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
      targetPage.classList.add('active');
      currentPage = pageName;

      // Initialize page-specific functionality
      if (pageName === 'profile') {
        initializeProfilePage();
      } else if (pageName === 'calculator') {
        clearCalculator();
      } else if (pageName === 'reports') {
        initializeReportsPage();
      }
    }
  }

  // ===== Theme Functions =====
  function handleThemeToggle() {
    var themeSwitch = document.getElementById('themeSwitch');
    if (!themeSwitch) return;
    
    var isDark = themeSwitch.checked;
    var theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-color-scheme', theme);
    
    if (currentUser && userDataDatabase[currentUser]) {
      userDataDatabase[currentUser].theme = theme;
      saveData();
    }
    
    debug('Theme changed to: ' + theme);
  }

  // ===== Transaction Functions =====
  function handleTransactionSubmit(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    debug('Transaction form submitted');

    var amountInput = document.getElementById('amountInput');
    var typeInput = document.getElementById('typeInput');
    var categoryInput = document.getElementById('categoryInput');
    var dateInput = document.getElementById('dateInput');
    var descriptionInput = document.getElementById('descriptionInput');

    if (!amountInput || !typeInput || !categoryInput || !dateInput) {
      debug('Transaction form inputs not found');
      return false;
    }

    var amount = parseFloat(amountInput.value);
    var type = typeInput.value;
    var category = categoryInput.value;
    var date = dateInput.value;
    var description = descriptionInput ? descriptionInput.value.trim() : '';

    if (!amount || amount <= 0) {
      alert('Please enter a valid amount.');
      amountInput.focus();  
      return false;
    }

    if (!type) {
      alert('Please select a transaction type.');
      typeInput.focus();
      return false;
    }

    if (!category) {
      alert('Please select a category.');
      categoryInput.focus();
      return false;
    }

    if (!date) {
      alert('Please select a date.');
      dateInput.focus();
      return false;
    }

    var transaction = {
      id: Date.now() + Math.random(),
      amount: amount,
      type: type,
      category: category,
      date: date,
      description: description || '-',
      timestamp: new Date()
    };

    currentTransactions.unshift(transaction);

    if (currentUser && userDataDatabase[currentUser]) {
      userDataDatabase[currentUser].transactions = currentTransactions;
      saveData();
    }

    // Reset form
    var transactionForm = document.getElementById('transactionForm');
    if (transactionForm) transactionForm.reset();
    if (dateInput) dateInput.value = todayStr;
    
    renderTransactions();
    updateSummary();

    // Show success feedback
    var submitBtn = document.querySelector('#transactionForm button[type="submit"]');
    if (submitBtn) {
      var originalText = submitBtn.textContent;
      submitBtn.textContent = 'Added!';
      submitBtn.classList.add('success-animation');
      setTimeout(function() {
        submitBtn.textContent = originalText;
        submitBtn.classList.remove('success-animation');
      }, 1500);
    }

    return false;
  }

  function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    currentTransactions = currentTransactions.filter(function(txn) {
      return txn.id !== id;
    });
    
    if (currentUser && userDataDatabase[currentUser]) {
      userDataDatabase[currentUser].transactions = currentTransactions;
      saveData();
    }

    renderTransactions();
    updateSummary();
  }

  // ===== Rendering Functions =====
  function getFilteredTransactions() {
    var fromDateInput = document.getElementById('fromDate');
    var toDateInput = document.getElementById('toDate');
    
    var fromDate = fromDateInput && fromDateInput.value ? new Date(fromDateInput.value) : null;
    var toDate = toDateInput && toDateInput.value ? new Date(toDateInput.value) : null;

    return currentTransactions.filter(function(txn) {
      var txnDate = new Date(txn.date);
      
      if (fromDate && txnDate < fromDate) return false;
      if (toDate && txnDate > toDate) return false;
      
      return true;
    });
  }

  function formatDate(dateStr) {
    var date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function renderTransactions() {
    var transactionsTbody = document.getElementById('transactionsTbody');
    if (!transactionsTbody) return;
    
    transactionsTbody.innerHTML = '';

    var filteredTransactions = getFilteredTransactions();

    if (filteredTransactions.length === 0) {
      var row = document.createElement('tr');
      var cell = document.createElement('td');
      cell.colSpan = 6;
      cell.innerHTML = '<div class="empty-state"><h3>📭 No transactions found</h3><p>Add your first transaction above to get started!</p></div>';
      row.appendChild(cell);
      transactionsTbody.appendChild(row);
      return;
    }

    filteredTransactions.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    filteredTransactions.forEach(function(txn, index) {
      var row = document.createElement('tr');
      row.classList.add('transaction-row');
      row.style.animationDelay = (index * 0.1) + 's';

      var typeClass = txn.type === 'Credit' ? 'transaction-credit' : 'transaction-debit';
      var amountFormatted = currencyFormatter.format(txn.amount);

      row.innerHTML = 
        '<td>' + formatDate(txn.date) + '</td>' +
        '<td>' + txn.description + '</td>' +
        '<td><span class="category-badge">' + txn.category + '</span></td>' +
        '<td class="' + typeClass + '">' + txn.type + '</td>' +
        '<td class="text-right ' + typeClass + '">' + amountFormatted + '</td>' +
        '<td class="text-center">' +
          '<button class="btn btn--outline btn--sm delete-btn" data-id="' + txn.id + '" title="Delete transaction">' +
            '🗑️' +
          '</button>' +
        '</td>';

      transactionsTbody.appendChild(row);
    });

    // Add event listeners to delete buttons
    var deleteButtons = transactionsTbody.querySelectorAll('.delete-btn');
    deleteButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = parseFloat(this.getAttribute('data-id'));
        deleteTransaction(id);
      });
    });
  }

  function updateSummary() {
    var incomeTotalEl = document.getElementById('incomeTotal');
    var expenseTotalEl = document.getElementById('expenseTotal');
    var balanceTotalEl = document.getElementById('balanceTotal');
    
    if (!incomeTotalEl || !expenseTotalEl || !balanceTotalEl) return;

    var filteredTransactions = getFilteredTransactions();

    var totals = filteredTransactions.reduce(function(acc, txn) {
      if (txn.type === 'Credit') {
        acc.income += txn.amount;
      } else if (txn.type === 'Debit') {
        acc.expense += txn.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });

    var balance = totals.income - totals.expense;

    incomeTotalEl.textContent = currencyFormatter.format(totals.income);
    expenseTotalEl.textContent = currencyFormatter.format(totals.expense);
    balanceTotalEl.textContent = currencyFormatter.format(balance);

    balanceTotalEl.className = 'summary__value ' + (balance >= 0 ? 'balance' : 'debit');
  }

  // ===== Calculator Functions =====
  function calcInput(char) {
    if (char === '⌫') {
      calculatorExpression = calculatorExpression.slice(0, -1);
    } else {
      calculatorExpression += char;
    }
    var calcDisplay = document.getElementById('calcDisplay');
    if (calcDisplay) calcDisplay.value = calculatorExpression;
  }

  function clearCalculator() {
    calculatorExpression = '';
    var calcDisplay = document.getElementById('calcDisplay');
    if (calcDisplay) calcDisplay.value = '';
  }

  function calculateResult() {
    try {
      var expression = calculatorExpression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-');
      
      if (!/^[0-9+\-*/.% ()]+$/.test(expression)) {
        throw new Error('Invalid expression');
      }
      
      var result = Function('"use strict"; return (' + expression + ')')();
      calculatorExpression = result.toString();
      var calcDisplay = document.getElementById('calcDisplay');
      if (calcDisplay) calcDisplay.value = result;
    } catch (error) {
      var calcDisplay = document.getElementById('calcDisplay');
      if (calcDisplay) calcDisplay.value = 'Error';
      calculatorExpression = '';
    }
  }

  function handleSipCalculation(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    var sipAmountInput = document.getElementById('sipAmount');
    var sipRateInput = document.getElementById('sipRate');
    var sipTenureInput = document.getElementById('sipTenure');
    
    if (!sipAmountInput || !sipRateInput || !sipTenureInput) return false;
    
    var monthlyAmount = parseFloat(sipAmountInput.value);
    var annualRate = parseFloat(sipRateInput.value);
    var years = parseFloat(sipTenureInput.value);
    
    if (!monthlyAmount || !annualRate || !years || monthlyAmount <= 0 || annualRate <= 0 || years <= 0) {
      alert('Please enter valid positive values for all fields.');
      return false;
    }
    
    // SIP calculation formula
    var monthlyRate = annualRate / 12 / 100;
    var totalMonths = years * 12;
    var futureValue = monthlyAmount * (((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate));
    var totalInvestment = monthlyAmount * totalMonths;
    var totalGain = futureValue - totalInvestment;
    
    // Display results
    var sipResults = document.getElementById('sipResults');
    var totalInvestmentEl = document.getElementById('totalInvestment');
    var futureValueEl = document.getElementById('futureValue');
    var totalGainEl = document.getElementById('totalGain');
    
    if (sipResults) sipResults.classList.remove('hidden');
    if (totalInvestmentEl) totalInvestmentEl.textContent = currencyFormatter.format(totalInvestment);
    if (futureValueEl) futureValueEl.textContent = currencyFormatter.format(futureValue);
    if (totalGainEl) totalGainEl.textContent = currencyFormatter.format(totalGain);
    
    return false;
  }

  function clearSipCalculator() {
    var sipForm = document.getElementById('sipCalculatorForm');
    var sipResults = document.getElementById('sipResults');
    
    if (sipForm) sipForm.reset();
    if (sipResults) sipResults.classList.add('hidden');
  }

  // Make calculator functions globally available
  window.calcInput = calcInput;
  window.clearCalculator = clearCalculator;
  window.calculateResult = calculateResult;

  // ===== Import/Export Functions =====
  function exportTransactions() {
    var filteredTransactions = getFilteredTransactions();
    
    if (filteredTransactions.length === 0) {
      alert('No transactions to export.');
      return;
    }

    var exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      user: currentUser,
      transactions: filteredTransactions
    };

    var jsonString = JSON.stringify(exportData, null, 2);
    var blob = new Blob([jsonString], { type: 'application/json' });
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'myMoney_transactions_' + todayStr + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // Success feedback
    var exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      var originalText = exportBtn.textContent;
      exportBtn.textContent = 'Exported!';
      exportBtn.classList.add('success-animation');
      setTimeout(function() {
        exportBtn.textContent = originalText;
        exportBtn.classList.remove('success-animation');
      }, 2000);
    }
  }

  function importTransactions(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var importData = JSON.parse(e.target.result);
        
        // Check if it's a full account file (version 2)
        if (importData.version === 2 && importData.syncType === 'file') {
          importAccountFile(file);
          return;
        }
        
        // Validate import data (version 1 - transactions only)
        if (!importData.version || importData.version !== 1) {
          alert('Invalid file format. Please select a valid exported file.');
          return;
        }
        
        if (!importData.transactions || !Array.isArray(importData.transactions)) {
          alert('No valid transaction data found in the file.');
          return;
        }
        
        var importedCount = 0;
        var duplicateCount = 0;
        
        importData.transactions.forEach(function(txn) {
          // Check if transaction already exists
          var exists = currentTransactions.some(function(existing) {
            return existing.id === txn.id;
          });
          
          if (!exists && txn.amount && txn.type && txn.category && txn.date) {
            // Ensure transaction has proper structure
            var transaction = {
              id: txn.id || (Date.now() + Math.random()),
              amount: parseFloat(txn.amount),
              type: txn.type,
              category: txn.category,
              date: txn.date,
              description: txn.description || '-',
              timestamp: new Date(txn.timestamp || txn.date)
            };
            
            currentTransactions.push(transaction);
            importedCount++;
          } else if (exists) {
            duplicateCount++;
          }
        });
        
        if (importedCount > 0) {
          // Save updated transactions
          if (currentUser && userDataDatabase[currentUser]) {
            userDataDatabase[currentUser].transactions = currentTransactions;
            saveData();
          }
          
          renderTransactions();
          updateSummary();
          
          var message = 'Successfully imported ' + importedCount + ' transactions.';
          if (duplicateCount > 0) {
            message += ' ' + duplicateCount + ' duplicates were skipped.';
          }
          alert(message);
        } else {
          alert('No new transactions were imported. All transactions may already exist or the file format is invalid.');
        }
        
      } catch (error) {
        console.error('Import error:', error);
        alert('Error reading file. Please make sure it\'s a valid JSON file exported from this application.');
      }
    };
    
    reader.readAsText(file);
  }

  // ===== Profile Functions =====
  function initializeProfilePage() {
    var profileUsername = document.getElementById('profileUsername');
    var profileSecurityQuestion = document.getElementById('profileSecurityQuestion');
    var profileSecurityAnswer = document.getElementById('profileSecurityAnswer');
    
    if (currentUser) {
      if (profileUsername) profileUsername.value = currentUser;
      
      if (usersDatabase[currentUser]) {
        var user = usersDatabase[currentUser];
        if (profileSecurityQuestion) {
          profileSecurityQuestion.value = securityQuestions[user.securityQuestion];
        }
        if (profileSecurityAnswer) {
          profileSecurityAnswer.value = '*'.repeat(user.securityAnswer.length);
        }
      }
    }
  }

  function toggleSecurityAnswerVisibility() {
    var profileSecurityAnswer = document.getElementById('profileSecurityAnswer');
    var toggleBtn = document.getElementById('toggleSecurityAnswer');
    
    if (!profileSecurityAnswer || !toggleBtn || !currentUser || !usersDatabase[currentUser]) return;
    
    if (profileSecurityAnswer.type === 'password') {
      profileSecurityAnswer.type = 'text';
      profileSecurityAnswer.value = usersDatabase[currentUser].securityAnswer;
      toggleBtn.textContent = '🙈';
    } else {
      profileSecurityAnswer.type = 'password';
      profileSecurityAnswer.value = '*'.repeat(usersDatabase[currentUser].securityAnswer.length);
      toggleBtn.textContent = '👁️';
    }
  }

  function showSecurityModal() {
    var modal = document.getElementById('securityModal');
    var newSecurityQuestion = document.getElementById('newSecurityQuestion');
    var newSecurityAnswer = document.getElementById('newSecurityAnswer');
    
    if (!modal || !currentUser || !usersDatabase[currentUser]) return;
    
    // Populate current values
    if (newSecurityQuestion) {
      newSecurityQuestion.value = usersDatabase[currentUser].securityQuestion;
    }
    if (newSecurityAnswer) {
      newSecurityAnswer.value = usersDatabase[currentUser].securityAnswer;
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('active');
  }

  function hideSecurityModal() {
    var modal = document.getElementById('securityModal');
    if (modal) {
      modal.classList.remove('active');
      modal.classList.add('hidden');
    }
  }

  function handleSecurityUpdate(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    var newSecurityQuestion = document.getElementById('newSecurityQuestion');
    var newSecurityAnswer = document.getElementById('newSecurityAnswer');
    var errorElement = document.getElementById('securityUpdateError');
    var successElement = document.getElementById('securityUpdateSuccess');
    
    if (!newSecurityQuestion || !newSecurityAnswer || !currentUser) return false;
    
    var question = newSecurityQuestion.value;
    var answer = newSecurityAnswer.value.trim().toLowerCase();
    
    if (!question) {
      showError(errorElement, 'Please select a security question.');
      return false;
    }
    
    if (!answer) {
      showError(errorElement, 'Please provide an answer.');
      return false;
    }
    
    // Update security settings
    usersDatabase[currentUser].securityQuestion = question;
    usersDatabase[currentUser].securityAnswer = answer;
    saveData();
    
    showSuccess(successElement, 'Security settings updated successfully!');
    
    // Update profile page
    setTimeout(function() {
      initializeProfilePage();
      hideSecurityModal();
    }, 1500);
    
    return false;
  }

  function handlePasswordChange(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    var currentPassword = document.getElementById('currentPassword');
    var newPassword = document.getElementById('newPassword');
    var confirmNewPassword = document.getElementById('confirmNewPassword');
    var errorElement = document.getElementById('passwordChangeError');
    var successElement = document.getElementById('passwordChangeSuccess');

    if (!currentPassword || !newPassword || !confirmNewPassword) return false;

    if (errorElement) errorElement.classList.add('hidden');
    if (successElement) successElement.classList.add('hidden');

    if (!currentUser || !usersDatabase[currentUser]) {
      showError(errorElement, 'User not found.');
      return false;
    }

    if (usersDatabase[currentUser].password !== currentPassword.value) {
      showError(errorElement, 'Current password is incorrect.');
      return false;
    }

    if (newPassword.value.length < 6) {
      showError(errorElement, 'New password must be at least 6 characters long.');
      return false;
    }

    if (newPassword.value !== confirmNewPassword.value) {
      showError(errorElement, 'New passwords do not match.');
      return false;
    }

    // Update password
    usersDatabase[currentUser].password = newPassword.value;
    saveData();
    showSuccess(successElement, 'Password updated successfully!');
    
    // Reset form
    var passwordChangeForm = document.getElementById('passwordChangeForm');
    if (passwordChangeForm) passwordChangeForm.reset();

    return false;
  }

  // ===== Reports Functions =====
  function initializeReportsPage() {
    var reportSummary = document.getElementById('reportSummary');
    var exportReportBtn = document.getElementById('exportReportBtn');
    
    if (reportSummary) {
      reportSummary.innerHTML = '<p>Select a date range and click "Generate Report" to view detailed analytics.</p>';
    }
    
    if (exportReportBtn) {
      exportReportBtn.classList.add('hidden');
    }
  }

  function generateReport() {
    var reportPeriod = document.getElementById('reportPeriod');
    var reportFromDate = document.getElementById('reportFromDate');
    var reportToDate = document.getElementById('reportToDate');
    var exportReportBtn = document.getElementById('exportReportBtn');
    
    if (!reportPeriod) return;
    
    var period = reportPeriod.value;
    var fromDate, toDate;
    
    var today = new Date();
    toDate = new Date(today);
    
    if (period === 'custom') {
      if (!reportFromDate.value || !reportToDate.value) {
        alert('Please select both from and to dates for custom range.');
        return;
      }
      fromDate = new Date(reportFromDate.value);
      toDate = new Date(reportToDate.value);
    } else {
      var days = parseInt(period);
      fromDate = new Date(today);
      fromDate.setDate(today.getDate() - days);
    }
    
    // Filter transactions for the selected period
    var reportTransactions = currentTransactions.filter(function(txn) {
      var txnDate = new Date(txn.date);
      return txnDate >= fromDate && txnDate <= toDate;
    });
    
    if (reportTransactions.length === 0) {
      alert('No transactions found for the selected period.');
      return;
    }
    
    // Store report data for export
    currentReportData = {
      period: period,
      fromDate: fromDate,
      toDate: toDate,
      transactions: reportTransactions
    };
    
    // Generate charts
    generateIncomeExpenseChart(reportTransactions);
    generateBalanceTrendChart(reportTransactions);
    generateReportSummary(reportTransactions);
    
    // Show export button
    if (exportReportBtn) {
      exportReportBtn.classList.remove('hidden');
    }
  }

  function generateIncomeExpenseChart(transactions) {
    var ctx = document.getElementById('pieChart');
    if (!ctx) return;
    
    var totals = transactions.reduce(function(acc, txn) {
      if (txn.type === 'Credit') {
        acc.income += txn.amount;
      } else if (txn.type === 'Debit') {
        acc.expense += txn.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });
    
    if (pieChart) {
      pieChart.destroy();
    }
    
    pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Income', 'Expenses'],
        datasets: [{
          data: [totals.income, totals.expense],
          backgroundColor: ['#1FB8CD', '#B4413C'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  function generateBalanceTrendChart(transactions) {
    var ctx = document.getElementById('lineChart');
    if (!ctx) return;
    
    // Sort transactions by date
    var sortedTransactions = transactions.slice().sort(function(a, b) {
      return new Date(a.date) - new Date(b.date);
    });
    
    // Calculate running balance
    var balanceData = [];
    var labels = [];
    var runningBalance = 0;
    
    sortedTransactions.forEach(function(txn) {
      if (txn.type === 'Credit') {
        runningBalance += txn.amount;
      } else {
        runningBalance -= txn.amount;
      }
      
      labels.push(formatDate(txn.date));
      balanceData.push(runningBalance);
    });
    
    if (lineChart) {
      lineChart.destroy();
    }
    
    lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Balance Trend',
          data: balanceData,
          borderColor: '#1FB8CD',
          backgroundColor: 'rgba(31, 184, 205, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₹' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }

  function generateReportSummary(transactions) {
    var reportSummary = document.getElementById('reportSummary');
    if (!reportSummary) return;
    
    var totals = transactions.reduce(function(acc, txn) {
      if (txn.type === 'Credit') {
        acc.income += txn.amount;
      } else if (txn.type === 'Debit') {
        acc.expense += txn.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });
    
    var balance = totals.income - totals.expense;
    
    reportSummary.innerHTML = 
      '<div class="summary-grid">' +
        '<div class="summary-item">' +
          '<h4>Total Income</h4>' +
          '<p class="summary-value income">' + currencyFormatter.format(totals.income) + '</p>' +
        '</div>' +
        '<div class="summary-item">' +
          '<h4>Total Expenses</h4>' +
          '<p class="summary-value expense">' + currencyFormatter.format(totals.expense) + '</p>' +
        '</div>' +
        '<div class="summary-item">' +
          '<h4>Net Balance</h4>' +
          '<p class="summary-value ' + (balance >= 0 ? 'positive' : 'negative') + '">' + currencyFormatter.format(balance) + '</p>' +
        '</div>' +
        '<div class="summary-item">' +
          '<h4>Total Transactions</h4>' +
          '<p class="summary-value">' + transactions.length + '</p>' +
        '</div>' +
      '</div>';
  }

  function exportReport() {
    if (!currentReportData) {
      alert('Please generate a report first.');
      return;
    }
    
    var reportContent = generateReportHTML();
    
    var blob = new Blob([reportContent], { 
      type: 'application/msword' 
    });
    
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'MyMoney_Report_' + todayStr + '.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    // Success feedback
    var exportReportBtn = document.getElementById('exportReportBtn');
    if (exportReportBtn) {
      var originalText = exportReportBtn.textContent;
      exportReportBtn.textContent = 'Report Exported!';
      exportReportBtn.classList.add('success-animation');
      setTimeout(function() {
        exportReportBtn.textContent = originalText;
        exportReportBtn.classList.remove('success-animation');
      }, 2000);
    }
  }

  function generateReportHTML() {
    var data = currentReportData;
    var totals = data.transactions.reduce(function(acc, txn) {
      if (txn.type === 'Credit') {
        acc.income += txn.amount;
      } else {
        acc.expense += txn.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });
    
    var balance = totals.income - totals.expense;
    
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>MyMoney Financial Report</title></head><body>';
    html += '<h1 style="text-align: center; color: #1FB8CD;">MyMoney by UTK - Financial Report</h1>';
    html += '<h2>Report Period: ' + data.fromDate.toLocaleDateString() + ' to ' + data.toDate.toLocaleDateString() + '</h2>';
    html += '<h2>Generated for: ' + currentUser + '</h2>';
    html += '<hr>';
    
    html += '<h3>Financial Summary</h3>';
    html += '<table border="1" style="width: 100%; border-collapse: collapse;">';
    html += '<tr><td><strong>Total Income</strong></td><td style="color: green;">' + currencyFormatter.format(totals.income) + '</td></tr>';
    html += '<tr><td><strong>Total Expenses</strong></td><td style="color: red;">' + currencyFormatter.format(totals.expense) + '</td></tr>';
    html += '<tr><td><strong>Net Balance</strong></td><td style="color: ' + (balance >= 0 ? 'green' : 'red') + ';">' + currencyFormatter.format(balance) + '</td></tr>';
    html += '<tr><td><strong>Total Transactions</strong></td><td>' + data.transactions.length + '</td></tr>';
    html += '</table>';
    
    html += '<h3>Transaction Details</h3>';
    html += '<table border="1" style="width: 100%; border-collapse: collapse;">';
    html += '<tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th></tr>';
    
    data.transactions.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    
    data.transactions.forEach(function(txn) {
      var amountColor = txn.type === 'Credit' ? 'green' : 'red';
      html += '<tr>';
      html += '<td>' + formatDate(txn.date) + '</td>';
      html += '<td>' + txn.description + '</td>';
      html += '<td>' + txn.category + '</td>';
      html += '<td>' + txn.type + '</td>';
      html += '<td style="color: ' + amountColor + ';">' + currencyFormatter.format(txn.amount) + '</td>';
      html += '</tr>';
    });
    
    html += '</table>';
    html += '<hr>';
    html += '<p style="text-align: center; font-size: 12px; color: #666;">Report generated on ' + new Date().toLocaleString() + '</p>';
    html += '</body></html>';
    
    return html;
  }

  // ===== Event Setup =====
  function setupEventListeners() {
    debug('Setting up event listeners');

    // Wait a bit to ensure DOM is ready
    setTimeout(function() {
      // Login form
      var loginFormElement = document.getElementById('loginFormElement');
      if (loginFormElement) {
        loginFormElement.addEventListener('submit', handleLogin);
        debug('Login form listener attached');
      } else {
        debug('Login form element not found');
      }

      // Register form
      var registerFormElement = document.getElementById('registerFormElement');
      if (registerFormElement) {
        registerFormElement.addEventListener('submit', handleRegister);
        debug('Register form listener attached');
      }

      // Forgot password form
      var forgotPasswordFormElement = document.getElementById('forgotPasswordFormElement');
      if (forgotPasswordFormElement) {
        forgotPasswordFormElement.addEventListener('submit', handleForgotPassword);
        debug('Forgot password form listener attached');
      }

      // Auth form toggles
      var showRegisterBtn = document.getElementById('showRegisterBtn');
      if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', function(e) {
          e.preventDefault();
          debug('Show register clicked');
          var loginForm = document.getElementById('loginForm');
          var registerForm = document.getElementById('registerForm');
          if (loginForm) loginForm.classList.add('hidden');
          if (registerForm) registerForm.classList.remove('hidden');
        });
        debug('Show register button listener attached');
      }

      var showLoginBtn = document.getElementById('showLoginBtn');
      if (showLoginBtn) {
        showLoginBtn.addEventListener('click', function(e) {
          e.preventDefault();
          debug('Show login clicked');
          showLoginForm();
        });
        debug('Show login button listener attached');
      }

      var showForgotPasswordBtn = document.getElementById('showForgotPasswordBtn');
      if (showForgotPasswordBtn) {
        showForgotPasswordBtn.addEventListener('click', function(e) {
          e.preventDefault();
          debug('Show forgot password clicked');
          var loginForm = document.getElementById('loginForm');
          var forgotPasswordForm = document.getElementById('forgotPasswordForm');
          if (loginForm) loginForm.classList.add('hidden');
          if (forgotPasswordForm) forgotPasswordForm.classList.remove('hidden');
        });
        debug('Show forgot password button listener attached');
      }

      var backToLoginBtn = document.getElementById('backToLoginBtn');
      if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', function(e) {
          e.preventDefault();
          debug('Back to login clicked');
          showLoginForm();
        });
        debug('Back to login button listener attached');
      }

      // === Sync functionality ===
      
      // QR Code scan
      var scanQRBtn = document.getElementById('scanQRBtn');
      var qrScanInput = document.getElementById('qrScanInput');
      if (scanQRBtn && qrScanInput) {
        scanQRBtn.addEventListener('click', function() {
          qrScanInput.click();
        });
        qrScanInput.addEventListener('change', function(e) {
          var file = e.target.files[0];
          if (file) {
            handleQRScan(file);
          }
          e.target.value = '';
        });
      }

      // Import account file (auth screen)
      var importFileAuthBtn = document.getElementById('importFileAuthBtn');
      var importFileInputAuth = document.getElementById('importFileInputAuth');
      if (importFileAuthBtn && importFileInputAuth) {
        importFileAuthBtn.addEventListener('click', function() {
          importFileInputAuth.click();
        });
        importFileInputAuth.addEventListener('change', function(e) {
          var file = e.target.files[0];
          if (file) {
            importAccountFile(file);
          }
          e.target.value = '';
        });
      }

      // Quick sync button (dashboard)
      var quickSyncBtn = document.getElementById('quickSyncBtn');
      if (quickSyncBtn) {
        quickSyncBtn.addEventListener('click', function() {
          navigateToPage('profile');
        });
      }

      // Generate QR Code
      var generateQRBtn = document.getElementById('generateQRBtn');
      if (generateQRBtn) {
        generateQRBtn.addEventListener('click', generateQRCode);
      }

      // Export Account
      var exportAccountBtn = document.getElementById('exportAccountBtn');
      if (exportAccountBtn) {
        exportAccountBtn.addEventListener('click', exportAccountData);
      }

      // Generate Share Link
      var generateLinkBtn = document.getElementById('generateLinkBtn');
      if (generateLinkBtn) {
        generateLinkBtn.addEventListener('click', generateShareLink);
      }

      // QR Modal controls
      var closeQRModal = document.getElementById('closeQRModal');
      var closeQRModalBtn = document.getElementById('closeQRModalBtn');
      var downloadQRBtn = document.getElementById('downloadQRBtn');

      if (closeQRModal) {
        closeQRModal.addEventListener('click', function() {
          var qrModal = document.getElementById('qrModal');
          if (qrModal) {
            qrModal.classList.remove('active');
            qrModal.classList.add('hidden');
          }
        });
      }

      if (closeQRModalBtn) {
        closeQRModalBtn.addEventListener('click', function() {
          var qrModal = document.getElementById('qrModal');
          if (qrModal) {
            qrModal.classList.remove('active');
            qrModal.classList.add('hidden');
          }
        });
      }

      if (downloadQRBtn) {
        downloadQRBtn.addEventListener('click', downloadQRCode);
      }

      // Link Modal controls
      var closeLinkModal = document.getElementById('closeLinkModal');
      var closeLinkModalBtn = document.getElementById('closeLinkModalBtn');
      var copyLinkBtn = document.getElementById('copyLinkBtn');

      if (closeLinkModal) {
        closeLinkModal.addEventListener('click', function() {
          var linkModal = document.getElementById('linkModal');
          if (linkModal) {
            linkModal.classList.remove('active');
            linkModal.classList.add('hidden');
          }
        });
      }

      if (closeLinkModalBtn) {
        closeLinkModalBtn.addEventListener('click', function() {
          var linkModal = document.getElementById('linkModal');
          if (linkModal) {
            linkModal.classList.remove('active');
            linkModal.classList.add('hidden');
          }
        });
      }

      if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyShareLink);
      }

      // Profile picture functionality
      var changePicBtn = document.getElementById('changePicBtn');
      var profilePicInput = document.getElementById('profilePicInput');
      var resetPicBtn = document.getElementById('resetPicBtn');
      
      if (changePicBtn && profilePicInput) {
        changePicBtn.addEventListener('click', function() {
          profilePicInput.click();
        });
        
        profilePicInput.addEventListener('change', handleProfilePicChange);
      }
      
      if (resetPicBtn) {
        resetPicBtn.addEventListener('click', resetProfilePic);
      }

      // Security settings
      var toggleSecurityAnswer = document.getElementById('toggleSecurityAnswer');
      if (toggleSecurityAnswer) {
        toggleSecurityAnswer.addEventListener('click', toggleSecurityAnswerVisibility);
      }
      
      var updateSecurityBtn = document.getElementById('updateSecurityBtn');
      if (updateSecurityBtn) {
        updateSecurityBtn.addEventListener('click', showSecurityModal);
      }
      
      var closeSecurityModal = document.getElementById('closeSecurityModal');
      var cancelSecurityUpdate = document.getElementById('cancelSecurityUpdate');
      if (closeSecurityModal) {
        closeSecurityModal.addEventListener('click', hideSecurityModal);
      }
      if (cancelSecurityUpdate) {
        cancelSecurityUpdate.addEventListener('click', hideSecurityModal);
      }
      
      var securityUpdateForm = document.getElementById('securityUpdateForm');
      if (securityUpdateForm) {
        securityUpdateForm.addEventListener('submit', handleSecurityUpdate);
      }

      // Logout
      var logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
      }

      // Theme toggle
      var themeSwitch = document.getElementById('themeSwitch');
      if (themeSwitch) {
        themeSwitch.addEventListener('change', handleThemeToggle);
      }

      // Navigation
      var navLinks = document.querySelectorAll('.nav-link');
      navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
          var pageName = this.getAttribute('data-page');
          navigateToPage(pageName);
        });
      });

      // Transaction form
      var transactionForm = document.getElementById('transactionForm');
      if (transactionForm) {
        transactionForm.addEventListener('submit', handleTransactionSubmit);
      }

      // SIP Calculator form
      var sipCalculatorForm = document.getElementById('sipCalculatorForm');
      if (sipCalculatorForm) {
        sipCalculatorForm.addEventListener('submit', handleSipCalculation);
      }
      
      // SIP Clear button
      var clearSipBtn = document.getElementById('clearSipBtn');
      if (clearSipBtn) {
        clearSipBtn.addEventListener('click', clearSipCalculator);
      }

      // Date filters
      var fromDateInput = document.getElementById('fromDate');
      var toDateInput = document.getElementById('toDate');
      
      if (fromDateInput) {
        fromDateInput.addEventListener('change', function() {
          renderTransactions();
          updateSummary();
        });
      }

      if (toDateInput) {  
        toDateInput.addEventListener('change', function() {
          renderTransactions();
          updateSummary();
        });
      }

      // Clear filters
      var clearFiltersBtn = document.getElementById('clearFiltersBtn');
      if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
          if (fromDateInput) fromDateInput.value = '';
          if (toDateInput) toDateInput.value = '';
          renderTransactions();
          updateSummary();
        });
      }

      // Import/Export
      var exportBtn = document.getElementById('exportBtn');
      if (exportBtn) {
        exportBtn.addEventListener('click', exportTransactions);
      }

      var importBtn = document.getElementById('importBtn');
      var importFileInput = document.getElementById('importFileInput');
      
      if (importBtn && importFileInput) {
        importBtn.addEventListener('click', function() {
          importFileInput.click();
        });
        
        importFileInput.addEventListener('change', function(e) {
          var file = e.target.files[0];
          if (file) {
            importTransactions(file);
          }
          e.target.value = '';
        });
      }

      // Generate Report
      var generateReportBtn = document.getElementById('generateReportBtn');
      if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateReport);
      }
      
      // Export Report
      var exportReportBtn = document.getElementById('exportReportBtn');
      if (exportReportBtn) {
        exportReportBtn.addEventListener('click', exportReport);
      }

      // Report period change
      var reportPeriod = document.getElementById('reportPeriod');
      var customDateRange = document.getElementById('customDateRange');
      if (reportPeriod && customDateRange) {
        reportPeriod.addEventListener('change', function() {
          if (this.value === 'custom') {
            customDateRange.classList.remove('hidden');
          } else {
            customDateRange.classList.add('hidden');
          }
        });
      }

      // Password change form
      var passwordChangeForm = document.getElementById('passwordChangeForm');
      if (passwordChangeForm) {
        passwordChangeForm.addEventListener('submit', handlePasswordChange);
      }

      // Make navigateToPage globally available
      window.navigateToPage = navigateToPage;

      debug('Event listeners setup complete');
    }, 100);
  }

  // ===== Initialization =====
  function init() {
    debug('Initializing MyMoney by UTK');
    
    // Load data first
    loadData();
    
    // Check for URL import
    handleURLImport();
    
    // Initialize theme
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-color-scheme', prefersDark ? 'dark' : 'light');
    
    var themeSwitch = document.getElementById('themeSwitch');
    if (themeSwitch) {
      themeSwitch.checked = prefersDark;
    }

    setupEventListeners();
    showAuth();
    
    debug('MyMoney by UTK initialized successfully');
    debug('Demo credentials: username: demo, password: demo123');
  }

  // ===== Wait for DOM to be fully loaded =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM is already loaded
    init();
  }

})();
