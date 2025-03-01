document.addEventListener('DOMContentLoaded', () => {
    const body = document.querySelector("body");
    const sidebar = body.querySelector(".sidebar");
    const overlay = document.getElementById("overlay");
    const arrowBtn = document.getElementById("arrow-btn"); // ปุ่มเปิด/ปิด Sidebar

    // ฟังก์ชันเปิด/ปิด Sidebar
    const toggleSidebar = () => {
        sidebar.classList.toggle("close");
        overlay.classList.toggle("show", !sidebar.classList.contains("close"));
    };

    // ตั้งค่าการคลิกปุ่ม arrowBtn เพื่อเปิด/ปิด Sidebar
    arrowBtn.addEventListener("click", toggleSidebar);

    // ตั้งค่าการคลิกที่ overlay เพื่อปิด Sidebar
    overlay.addEventListener("click", () => {
        sidebar.classList.add("close");
        overlay.classList.remove("show");
    });

    // ฟังก์ชันเพื่อเพิ่ม class 'active' ให้กับ menu item ที่ตรงกับ path ปัจจุบัน
    const setActiveMenuItem = () => {
        const menuItems = document.querySelectorAll(".menu-item");
        const currentPath = window.location.pathname;

        menuItems.forEach(item => {
            const link = item.querySelector("a");
            const href = link.getAttribute("href");

            item.classList.remove("active"); if (href === currentPath) {
                item.classList.add("active");
            }

            else if (currentPath.startsWith("/SystemAnnouncements") && href === "/SystemAnnouncements") {
                item.classList.add("active");
            }
        });
    };

    setActiveMenuItem();

    window.addEventListener('popstate', setActiveMenuItem);
});