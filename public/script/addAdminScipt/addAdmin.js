document.getElementById("checkbox").addEventListener("change", function () {
    const passwordField = document.getElementById("password");
    const confirmPasswordField = document.getElementById("confirmPassword");
    
    if (this.checked) {
        passwordField.type = "text";
        confirmPasswordField.type = "text";
    } else {
        passwordField.type = "password";
        confirmPasswordField.type = "password";
    }
});

document.getElementById('profileImageInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('profileImageDisplay').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const alertElement = document.querySelector('.alert');
    if (alertElement && alertElement.textContent.trim() !== '') {
        alertElement.style.display = 'block';
    }
});

