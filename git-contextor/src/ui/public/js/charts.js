document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = '/api'; // Assuming default API port

    let indexingChart, vectorStoreChart, systemPerfChart;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };

    function createCharts() {
        const indexingCtx = document.getElementById('indexing-chart').getContext('2d');
        indexingChart = new Chart(indexingCtx, {
            type: 'bar',
            data: {
                labels: ['Files Indexed', 'Chunks Created', 'Errors'],
                datasets: [{
                    label: 'Indexing Stats',
                    data: [0, 0, 0],
                    backgroundColor: ['#4a90e2', '#50e3c2', '#ff3b30']
                }]
            },
            options: chartOptions
        });

        const vectorStoreCtx = document.getElementById('vector-store-chart').getContext('2d');
        vectorStoreChart = new Chart(vectorStoreCtx, {
            type: 'doughnut',
            data: {
                labels: ['Total Vectors', 'Avg. Dimensions'],
                datasets: [{
                    label: 'Vector Store',
                    data: [0, 0],
                    backgroundColor: ['#f5a623', '#bd10e0']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        const systemPerfCtx = document.getElementById('system-perf-chart').getContext('2d');
        systemPerfChart = new Chart(systemPerfCtx, {
            type: 'line',
            data: {
                labels: [], // Timestamps
                datasets: [{
                    label: 'CPU Usage (%)',
                    data: [],
                    borderColor: '#4a90e2',
                    tension: 0.1
                }, {
                    label: 'Memory (MB)',
                    data: [],
                    borderColor: '#d0021b',
                    tension: 0.1
                }]
            },
            options: chartOptions
        });
    }

    async function updateCharts() {
        try {
            const response = await fetch(`${API_BASE_URL}/metrics`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            // Update Indexing Chart
            indexingChart.data.datasets[0].data = [
                data.indexer?.totalFiles || 0,
                data.indexer?.totalChunks || 0,
                data.indexer?.errorCount || 0
            ];
            indexingChart.update();

            // Update Vector Store Chart
            vectorStoreChart.data.datasets[0].data = [
                data.vectorStore?.totalVectors || 0,
                data.vectorStore?.avgDimensions || 0
            ];
            vectorStoreChart.update();

            // Update System Performance Chart
            const now = new Date().toLocaleTimeString();
            systemPerfChart.data.labels.push(now);
            systemPerfChart.data.datasets[0].data.push(data.system?.cpuUsage || 0);
            systemPerfChart.data.datasets[1].data.push(data.system?.memoryUsageMb || 0);

            // Limit to 10 data points
            if (systemPerfChart.data.labels.length > 10) {
                systemPerfChart.data.labels.shift();
                systemPerfChart.data.datasets.forEach(dataset => dataset.data.shift());
            }
            systemPerfChart.update();

        } catch (error) {
            console.error('Error fetching metrics:', error);
        }
    }
    
    createCharts();
    updateCharts();
    setInterval(updateCharts, 5000); // Poll every 5 seconds
});
