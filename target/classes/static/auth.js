const signUpButton = document.getElementById('signUpBtn');
const signInButton = document.getElementById('signInBtn');
const container = document.getElementById('auth-container');

// Toggle Form Animations
if (signUpButton && signInButton && container) {
  signUpButton.addEventListener('click', () => {
    container.classList.add("right-panel-active");
  });

  signInButton.addEventListener('click', () => {
    container.classList.remove("right-panel-active");
  });
}

// User Authentication Logic
const signupForm = document.getElementById('signup-form');
const signinForm = document.getElementById('signin-form');

// Sign Up Handler
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;

        const errorMsg = document.getElementById('signup-error');
        const successMsg = document.getElementById('signup-success');
        
        errorMsg.innerText = '';
        successMsg.innerText = '';

        if (password !== confirmPassword) {
            errorMsg.innerText = "Passwords do not match!";
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                successMsg.innerText = "Account created successfully! Please Sign In.";
                signupForm.reset();
                setTimeout(() => {
                    container.classList.remove("right-panel-active");
                    successMsg.innerText = "";
                }, 1500);
            } else {
                errorMsg.innerText = data.error || "Failed to register";
            }
        } catch (error) {
            errorMsg.innerText = "Server error. Could not connect.";
        }
    });
}

// Sign In Handler
if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value;
        
        const errorMsg = document.getElementById('signin-error');
        const signInBtn = signinForm.querySelector('button');
        
        errorMsg.innerText = '';
        const prevText = signInBtn.innerText;
        signInBtn.innerText = 'Signing In...';

        try {
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Save active session
                localStorage.setItem('taleVerseSession', JSON.stringify({ name: data.name, email: data.email, role: data.role }));
                if (data.role === 'admin') {
                    window.location.href = "admin_database.html";
                } else {
                    window.location.href = "user.html"; // Redirect to user page
                }
            } else {
                errorMsg.innerText = data.error || "Invalid email or password!";
            }
        } catch (error) {
            errorMsg.innerText = "Server error. Could not connect.";
        } finally {
            signInBtn.innerText = prevText;
        }
    });
}
