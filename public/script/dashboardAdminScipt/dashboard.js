
// Server Monitoring
// ส่วน Server Monitoring ใน dashboard.js
// const cpuUsageText = document.getElementById("cpuUsageText");
// const memoryUsageText = document.getElementById("memoryUsageText");
const ctxCpu = document.querySelector("#cpuChart")?.getContext("2d");
const ctxMemory = document.querySelector("#memoryChart")?.getContext("2d");

if (ctxCpu && ctxMemory) {
    const cpuChart = new Chart(ctxCpu, {
        type: "doughnut",
        data: {
            labels: ["CPU Usage", "Idle"],
            datasets: [{
                data: [0, 100],
                backgroundColor: ["red", "lightgray"]
            }]
        },
        options: {
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true
                },
                centerText: {
                    text: "0%" // ค่าเริ่มต้น
                }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: (chart) => {
                const { width } = chart;
                const { top, height } = chart.chartArea;
                const ctx = chart.ctx;
    
                ctx.save();
                ctx.font = 'bold 18px Arial';
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
    
                const centerX = width / 2;
                const centerY = top + height / 2;
    
                const text = chart.options.plugins.centerText.text || '0%';
                ctx.fillText(text, centerX, centerY);
                ctx.restore();
            }
        }]
    });
    

    const memoryChart = new Chart(ctxMemory, {
        type: "doughnut",
        data: {
            labels: ["Memory Usage", "Free"],
            datasets: [{
                data: [0, 100],
                backgroundColor: ["blue", "lightgray"]
            }]
        },
        options: {
            plugins: {
                legend: {
                    display: false
                },
                centerText: {
                    text: "0%"
                }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: (chart) => {
                const { width } = chart;
                const { top, height } = chart.chartArea;
                const ctx = chart.ctx;
    
                ctx.save();
                ctx.font = 'bold 18px Arial';
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
    
                const centerX = width / 2;
                const centerY = top + height / 2;
    
                const text = chart.options.plugins.centerText.text || '0%';
                ctx.fillText(text, centerX, centerY);
                ctx.restore();
            }
        }]
    });
    

    const socket = io();
    socket.on("serverStats", data => {
        const cpuUsage = parseFloat(data.cpuUsage).toFixed(2);
        const memoryUsage = parseFloat(data.memoryUsage).toFixed(2);

        cpuChart.data.datasets[0].data = [cpuUsage, 100 - cpuUsage];
        cpuChart.options.plugins.centerText.text = `${cpuUsage}%`;
        cpuChart.update();

        memoryChart.data.datasets[0].data = [memoryUsage, 100 - memoryUsage];
        memoryChart.options.plugins.centerText.text = `${memoryUsage}%`;
        memoryChart.update();

        // cpuUsageText.innerText = `${cpuUsage}%`;
        // memoryUsageText.innerText = `${memoryUsage}%`;

        document.getElementById("uptime").innerText = Math.floor(data.uptime);
        document.getElementById("responseTime").innerText = data.responseTime;
    });
}

///Server Uptimeและ Response Time

const socket = io();

socket.on("serverStats", data => {
    const cpuUsage = parseFloat(data.cpuUsage).toFixed(2);
    const memoryUsage = parseFloat(data.memoryUsage).toFixed(2);
    const responseTime = parseFloat(data.responseTime).toFixed(2);
    
    // แปลง Uptime เป็น Days:Hours:Minutes
    let uptimeSeconds = Math.floor(data.uptime);
    let days = Math.floor(uptimeSeconds / 86400);
    let hours = Math.floor((uptimeSeconds % 86400) / 3600);
    let minutes = Math.floor((uptimeSeconds % 3600) / 60);
    let uptimeText = `${days}d ${hours}h ${minutes}m`;

    // กำหนดสีของ Response Time
    let responseIndicator = "🟢";
    if (responseTime > 500) responseIndicator = "🔴";
    else if (responseTime > 100) responseIndicator = "🟡";

    // อัปเดต UI
    document.getElementById("uptime").innerText = uptimeText;
    document.getElementById("responseTime").innerHTML = `${responseIndicator} ${responseTime} ms`;

    // อัปเดตกราฟ
    cpuChart.data.datasets[0].data = [cpuUsage, 100 - cpuUsage];
    cpuChart.options.plugins.centerText.text = `${cpuUsage}%`;
    cpuChart.update();

    memoryChart.data.datasets[0].data = [memoryUsage, 100 - memoryUsage];
    memoryChart.options.plugins.centerText.text = `${memoryUsage}%`;
    memoryChart.update();
});