document.addEventListener("DOMContentLoaded", function () {
  // เปิด Popup รายละเอียดผู้ใช้เมื่อคลิกแถวในตาราง
  document.querySelectorAll("tbody tr").forEach(row => {
    row.addEventListener("click", function () {
      const userId = this.getAttribute("data-user-id");
      const username = this.getAttribute("data-username");
      const email = this.getAttribute("data-email");
      const userid = this.getAttribute("data-userid");

      showUserDetailsPopup(userId, username, email, userid);
    });
  });

  // เปิด Popup ยืนยันการลบเมื่อคลิกปุ่มลบ
  const deleteButtons = document.querySelectorAll(".delete-btn");
  const popup = document.getElementById("deletePopup");
  const overlay = document.getElementById("overlay");
  const confirmDeleteBtn = document.getElementById("confirmDelete");
  const cancelDeleteBtn = document.getElementById("cancelDelete");
  let userIdToDelete = null; // เก็บ user ID ที่จะลบ

  deleteButtons.forEach(button => {
    button.addEventListener("click", function (event) {
      event.stopPropagation(); // หยุดการแพร่กระจายของเหตุการณ์
      console.log("ปุ่มลบถูกคลิก"); // ตรวจสอบใน Console
      userIdToDelete = this.getAttribute("data-id"); // ดึงค่า ID ของผู้ใช้
      popup.style.display = "block";
      overlay.style.display = "block";
    });
  });

  // ปิด Popup เมื่อคลิกยกเลิก
  cancelDeleteBtn.addEventListener("click", function () {
    popup.style.display = "none";
    overlay.style.display = "none";
    userIdToDelete = null; // รีเซ็ตค่า
  });

  // ปิด Popup เมื่อคลิก overlay
  overlay.addEventListener("click", function () {
    popup.style.display = "none";
    overlay.style.display = "none";
    userIdToDelete = null;
  });

  // ยืนยันการลบผู้ใช้
  confirmDeleteBtn.addEventListener("click", async function () {
    if (userIdToDelete) {
      deleteUser(userIdToDelete); // เรียกใช้ฟังก์ชัน deleteUser
      popup.style.display = "none";
      overlay.style.display = "none";
    }
  });

  // ปิด Popup รายละเอียดผู้ใช้
  document.getElementById("closePopupBtn").addEventListener("click", closeUserDetailsPopup);

  // บันทึกการเปลี่ยนแปลงชื่อผู้ใช้
  document.getElementById("saveUsernameBtn").addEventListener("click", saveUsernameChanges);

  // รีเซ็ตรหัสผ่าน
  const resetPasswordButton = document.getElementById("resetPasswordButton");
  if (resetPasswordButton) {
    resetPasswordButton.addEventListener("click", () => {
      const userId = document.querySelector("#user-details-popup .delete-btn").dataset.id;
      resetPassword(userId);
    });
  }

  // ค้นหาผู้ใช้
  function searchUsers() {
    const searchInput = document.querySelector('input[name="searchTerm"]');
    const table = document.querySelector("table");
    const tr = table.getElementsByTagName("tr");

    searchInput.addEventListener("input", () => {
      const searchTerm = searchInput.value.toUpperCase();

      for (let i = 1; i < tr.length; i++) {
        let found = false;
        const td = tr[i].getElementsByTagName("td");
        for (let j = 0; j < td.length; j++) {
          const txtValue = td[j].textContent || td[j].innerText;
          if (txtValue.toUpperCase().indexOf(searchTerm) > -1) {
            found = true;
            break;
          }
        }
        tr[i].style.display = found ? "" : "none";
      }
    });
  }

  searchUsers();
});

// ฟังก์ชันสำหรับแสดง Popup รายละเอียดผู้ใช้
function showUserDetailsPopup(userId, username, email, userid) {
  document.getElementById("user-id").innerText = userid;
  document.getElementById("user-username").value = username;
  document.getElementById("user-email").innerText = email;
  document.querySelector("#user-details-popup .delete-btn").dataset.id = userId;
  document.getElementById("user-details-popup").style.display = "block";
}

// ฟังก์ชันสำหรับปิด Popup รายละเอียดผู้ใช้
function closeUserDetailsPopup() {
  document.getElementById("user-details-popup").style.display = "none";
}

// ฟังก์ชันสำหรับบันทึกการเปลี่ยนแปลงชื่อผู้ใช้
function saveUsernameChanges() {
  const userId = document.querySelector("#user-details-popup .delete-btn").dataset.id;
  const newUsername = document.getElementById("user-username").value;

  fetch("/userAccountManagement/updateusersmanage", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, newUsername }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const usernameCell = document.querySelector(`tr[data-user-id="${userId}"] td:nth-child(2)`);
        usernameCell.innerText = newUsername;
        closeUserDetailsPopup();
        alert("อัปเดตชื่อผู้ใช้สำเร็จ");
      } else {
        alert("เกิดข้อผิดพลาดในการอัปเดตชื่อผู้ใช้");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดตชื่อผู้ใช้");
    });
}

// ฟังก์ชันสำหรับรีเซ็ตรหัสผ่าน
function resetPassword(userId) {
  fetch(`/admin/userAccountManagement/reset-password/${userId}`, {
    method: "POST",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        alert("ส่งอีเมลรีเซ็ตรหัสผ่านสำเร็จ");
      } else {
        alert("เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน");
    });
}

function deleteUser(userId) {
  if (!userId) {
      alert("ไม่พบ ID ของผู้ใช้ที่ต้องการลบ");
      return;
  }

  fetch(`/delete-user/${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
  })
  .then(response => response.json())
  .then(data => {
      if (data.success) {
          alert("ลบผู้ใช้สำเร็จ (Soft Delete)");
          window.location.reload();  // เพิ่มการรีเฟรชหน้าหลังจากลบ
      } else {
          alert(data.message || "เกิดข้อผิดพลาดในการลบผู้ใช้");
      }
  })
  .catch(error => {
      console.error("Error:", error);
      alert("เกิดข้อผิดพลาดในการลบผู้ใช้");
  });
}



