document.addEventListener("DOMContentLoaded", function () {
    function togglePasswordVisibility(inputId, toggleId) {
        const passwordInput = document.getElementById(inputId);
        const passwordToggle = document.getElementById(toggleId);

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordToggle.classList.remove('bx-show');
            passwordToggle.classList.add('bx-hide');
        } else {
            passwordInput.type = 'password';
            passwordToggle.classList.remove('bx-hide');
            passwordToggle.classList.add('bx-show');
        }
    }

    // เพิ่ม Event Listener ให้กับไอคอนตา
    document.getElementById("currentPasswordToggle")?.addEventListener("click", function () {
        togglePasswordVisibility("currentPassword", "currentPasswordToggle");
    });

    document.getElementById("newPasswordToggle")?.addEventListener("click", function () {
        togglePasswordVisibility("newPassword", "newPasswordToggle");
    });

    document.getElementById("confirmPasswordToggle")?.addEventListener("click", function () {
        togglePasswordVisibility("confirmPassword", "confirmPasswordToggle");
    });
});

document.addEventListener("DOMContentLoaded", function () {
    // ปิด popup
    document.getElementById("closeUserDetailsBtn").addEventListener("click", closeUserDetailsPopup);

    // บันทึกการเปลี่ยนแปลงชื่อผู้ใช้
    document.getElementById("saveUsernameBtn").addEventListener("click", saveUsernameChanges);

    // ลบผู้ใช้
    document.querySelectorAll(".delete-btn").forEach(button => {
        button.addEventListener("click", function () {
            const userId = this.dataset.id;
            deleteUser(userId);
        });
    });
});




document.addEventListener("DOMContentLoaded", function () {
    const changePasswordLink = document.getElementById("changePasswordLink");
    if (changePasswordLink) {
        changePasswordLink.addEventListener("click", function (event) {
            event.preventDefault();
            openChangePasswordPopup();
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("closeChangePasswordPopup").addEventListener("click", function () {
        closePopup("changePasswordPopup");
    });
});


function closePopup(popupId) {
    document.getElementById(popupId).style.display = "none";
}

function openChangePasswordPopup() {
    const popup = document.getElementById('changePasswordPopup');
    if (popup) {
        popup.style.display = 'flex'; // หรือ 'block' ขึ้นอยู่กับการจัดวาง
    } else {
        console.error('Popup element not found!');
    }
}

// ฟังก์ชันสำหรับตรวจสอบรหัสผ่าน
function validatePassword(password) {
    // ตรวจสอบความยาวอย่างน้อย 8 ตัวอักษร
    if (password.length < 8) {
        return "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร";
    }
    // ตรวจสอบว่ามีตัวอักษรพิมพ์ใหญ่ ตัวอักษรพิมพ์เล็ก และตัวเลข
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return "รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่ ตัวอักษรพิมพ์เล็ก และตัวเลข";
    }
    return null; // ผ่านเงื่อนไขทั้งหมด
}


//  เพิ่ม Event Listener สำหรับ submit form
document.getElementById('changePasswordForm').addEventListener('submit', function (event) {
    event.preventDefault(); // ป้องกันการ submit form แบบปกติ

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // ตรวจสอบรหัสผ่านใหม่
    const newPasswordError = validatePassword(newPassword);
    if (newPasswordError) {
        alert(newPasswordError);
        return;
    }

    //  ตรวจสอบว่ารหัสผ่านใหม่ตรงกับการยืนยันหรือไม่
    if (newPassword !== confirmPassword) {
        alert('รหัสผ่านใหม่ไม่ตรงกับการยืนยัน');
        return;
    }

    //  ส่งข้อมูลไปยัง server ด้วย AJAX
    fetch('/SettingAdmin/changePassword', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                closePopup('changePasswordPopup');
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
        });
});

//  โค้ดสำหรับเปลี่ยนรูปโปรไฟล์
const profileImageInput = document.getElementById('profileImageInput');
const profileImageDisplay = document.getElementById('profileImageDisplay');

profileImageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
        profileImageDisplay.src = event.target.result;
    }
    reader.readAsDataURL(file);
});
