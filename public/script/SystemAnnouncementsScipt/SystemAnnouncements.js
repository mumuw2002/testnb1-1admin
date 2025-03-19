  function searchAnnouncements() {
    const searchInput = document.querySelector('input[name="searchTerm"]');
    const table = document.querySelector('table'); // แก้ไขตรงนี้
    const tr = table.getElementsByTagName("tr");

    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toUpperCase();

      // กรองข้อมูลในตาราง
      for (let i = 1; i < tr.length; i++) { // เริ่มต้นที่ i = 1 เพื่อข้าม header row
        let found = false;
        const td = tr[i].getElementsByTagName("td");
        for (let j = 0; j < td.length; j++) { // วนลูปทุกคอลัมน์
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

  searchAnnouncements();

  document.addEventListener("DOMContentLoaded", function () {
    const masterCheckbox = document.querySelector('thead th input[type="checkbox"]');
    const tbody = document.querySelector("tbody");
    const noDataRow = document.querySelector(".no-data");
    const popupOverlay = document.querySelector(".popup-overlay");
    const confirmDeleteBtn = document.querySelector(".confirm-delete-btn");
    const cancelDeleteBtn = document.querySelector(".cancel-delete-btn");
    const checkboxes = tbody.querySelectorAll('input[type="checkbox"]');
    const selectedCount = document.getElementById("selected-count");
    const deleteSelectedBtn = document.getElementById("delete-selected-btn");
    const selectionStatus = document.querySelector(".selection-status"); // เพิ่มตัวแปร selectionStatus

    let currentDeleteId = null;
    let selectedAnnouncements = [];

    // ซ่อน selection-status ตอนเริ่มต้น
    selectionStatus.style.display = "none";

    masterCheckbox.addEventListener("change", function () {
      checkboxes.forEach(checkbox => checkbox.checked = masterCheckbox.checked);
      updateSelectedAnnouncements();
      updateSelectionStatus();
    });

    tbody.addEventListener("change", function (event) {
      if (event.target.type === "checkbox") {
        updateSelectedAnnouncements();
        updateSelectionStatus();
      }
    });

    function updateSelectedAnnouncements() {
      selectedAnnouncements = Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.closest("tr").querySelector(".delete-btn").getAttribute("data-id"));
    }

    function updateSelectionStatus() {
      const count = selectedAnnouncements.length;
      selectedCount.textContent = `${count} Selected`;
      deleteSelectedBtn.disabled = count === 0;

      // แสดงหรือซ่อน selection-status
      if (count > 0) {
        selectionStatus.style.display = "flex";
      } else {
        selectionStatus.style.display = "none";
      }
    }

    deleteSelectedBtn.addEventListener("click", function () {
      if (selectedAnnouncements.length > 0) {
        currentDeleteId = selectedAnnouncements;
        popupOverlay.style.display = "flex";
      } else {
        alert("กรุณาเลือกประกาศที่ต้องการลบ");
      }
    });

    document.body.addEventListener("click", function (event) {
      if (event.target.classList.contains("delete-btn")) {
        currentDeleteId = [event.target.getAttribute("data-id")];
        popupOverlay.style.display = "flex";
      }
    });

    cancelDeleteBtn.addEventListener("click", function () {
      currentDeleteId = null;
      popupOverlay.style.display = "none";
    });

    confirmDeleteBtn.addEventListener("click", async function () {
      if (currentDeleteId) {
        try {
          const deletePromises = currentDeleteId.map(id =>
            fetch(`/SystemAnnouncements/delete-announcement/${id}`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" }
            })
          );

          const responses = await Promise.all(deletePromises);
          const results = await Promise.all(responses.map(res => res.json()));

          const allSuccess = results.every(result => result.success);

          if (allSuccess) {
            alert("ลบประกาศเรียบร้อยแล้ว");
            location.reload();
          } else {
            const errorMessages = results.filter(result => !result.success)
              .map(result => result.message)
              .join(", ");
            alert(`ไม่สามารถลบบางประกาศได้: ${errorMessages}`);
          }
        } catch (error) {
          console.error("Error deleting announcement:", error);
          alert("เกิดข้อผิดพลาด: " + error.message);
        } finally {
          currentDeleteId = null;
          popupOverlay.style.display = "none";
          selectedAnnouncements = [];
          updateSelectionStatus();
        }
      }
    });

    function checkEmptyTable() {
      const tbody = document.querySelector("tbody"); // Get the tbody element
      const noDataRow = tbody.querySelector(".no-data"); // Find .no-data within tbody
      const rows = tbody.querySelectorAll("tr:not(.no-data)");

      if (noDataRow) { // Check if noDataRow was found
        noDataRow.style.display = rows.length === 0 ? "table-row" : "none";
        noDataRow.style.alignItems = "center"; // Use alignItems (camelCase)
      }
    }

    checkEmptyTable();

    tbody.addEventListener("click", function (event) {
      const target = event.target;
      const isCheckbox = target.type === "checkbox";
      const isDeleteBtn = target.classList.contains("delete-btn");

      if (!isCheckbox && !isDeleteBtn) {
        const row = target.closest("tr");
        showPopup(row);
      }
    });

  });
