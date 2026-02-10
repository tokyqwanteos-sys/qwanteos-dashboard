// Configuration du Dashboard
class Dashboard {
    constructor() {
        this.activeTasks = new Map(); // Map pour gérer plusieurs tâches actives
        this.timerIntervals = new Map(); // Map pour les intervalles de chaque tâche
        this.theme = 'light';
        
        // Initialisation
        this.init();
    }

    init() {
        // Initialiser le stockage
        this.initStorage();
        
        // Initialiser les événements
        this.initEvents();
        
        // Initialiser l'interface
        this.initUI();
        
        // Mettre à jour en temps réel
        this.updateRealTime();
        setInterval(() => this.updateRealTime(), 1000);
        
        // Sauvegarde automatique
        setInterval(() => this.autoSave(), 5 * 60 * 1000);
        
        // Restaurer les tâches actives depuis le stockage
        this.restoreActiveTasks();
    }

    initStorage() {
        // Vérifier et initialiser le stockage local
        if (!localStorage.getItem('qwanteos_agents')) {

            localStorage.setItem('qwanteos_agents', JSON.stringify(defaultAgents));
        }

        if (!localStorage.getItem('qwanteos_categories')) {
            const defaultCategories = [
                { id: 1, name: 'Développement', color: '#3498db' },
                { id: 2, name: 'Test', color: '#e74c3c' },
                { id: 3, name: 'Maintenance', color: '#2ecc71' },
                { id: 4, name: 'Support', color: '#f39c12' },
                { id: 5, name: 'Documentation', color: '#9b59b6' },
                { id: 6, name: 'Réunion', color: '#1abc9c' }
            ];
            localStorage.setItem('qwanteos_categories', JSON.stringify(defaultCategories));
        }

        if (!localStorage.getItem('qwanteos_tasks')) {
            localStorage.setItem('qwanteos_tasks', JSON.stringify([]));
        }

        if (!localStorage.getItem('qwanteos_settings')) {
            const defaultSettings = {
                theme: 'light',
                timeFormat: '24',
                autoSave: '5',
                lastBackup: null
            };
            localStorage.setItem('qwanteos_settings', JSON.stringify(defaultSettings));
        }

        // Stockage des tâches actives
        if (!localStorage.getItem('qwanteos_active_tasks')) {
            localStorage.setItem('qwanteos_active_tasks', JSON.stringify([]));
        }

        
    }

    initEvents() {
        // Navigation par onglets
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Empêcher la soumission du formulaire avec Enter
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startNewTask();
        });

        // Charger les agents dans le sélecteur
        this.loadAgentsToSelect();
        
        // Charger les catégories
        this.loadCategories();
        
        // Charger les paramètres
        this.loadSettings();
        
        // Mettre à jour la liste des agents
        this.updateAgentsList();
    }

    initUI() {
        // Mettre à jour la date actuelle
        this.updateCurrentDate();
        
        // Mettre à jour les statistiques
        this.updateStatistics();
        
        // Mettre à jour les graphiques
        this.updateCharts();
        
        // Mettre à jour les tâches du jour
        this.updateTodayTasks();
        
        // Mettre à jour les informations système
        this.updateSystemInfo();
        
        // Mettre à jour les statistiques temps réel
        this.updateRealTimeStats();
        
        // Mettre à jour la liste des tâches actives
        this.updateActiveTasksList();
    }

    switchTab(tabId) {
        // Désactiver tous les onglets
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        
        // Activer l'onglet sélectionné
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
        
        // Recharger les données si nécessaire
        if (tabId === 'tab1') {
            this.updateStatistics();
            this.updateCharts();
        } else if (tabId === 'tab2') {
            this.updateTodayTasks();
            this.updateRealTimeStats();
            this.updateActiveTasksList();
        } else if (tabId === 'tab3') {
            this.updateAgentsList();
            this.updateSystemInfo();
        }
    }

    // ============ ONGLET 1: STATISTIQUES ============
    updateStatistics() {
        const tasks = this.getTasks();
        const agents = this.getAgents();
        
        // Calculer les statistiques générales
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const activeTasksCount = this.activeTasks.size;
        
        // Calculer le temps total
        let totalSeconds = 0;
        tasks.forEach(task => {
            if (task.duration && typeof task.duration === 'string') {
                const timeParts = task.duration.split(':');
                if (timeParts.length === 3) {
                    const hours = parseInt(timeParts[0]) || 0;
                    const minutes = parseInt(timeParts[1]) || 0;
                    const seconds = parseInt(timeParts[2]) || 0;
                    totalSeconds += hours * 3600 + minutes * 60 + seconds;
                }
            }
        });
        
        // Ajouter le temps des tâches actives
        this.activeTasks.forEach(task => {
            if (task.startTime) {
                const elapsed = Date.now() - task.startTime - task.pausedTime;
                totalSeconds += Math.floor(elapsed / 1000);
            }
        });
        
        const totalTime = this.formatTime(totalSeconds);
        
        // Calculer la productivité moyenne
        const avgProductivity = tasks.length > 0 ? 
            Math.round((completedTasks / tasks.length) * 100) : 0;
        
        // Mettre à jour l'interface
        document.getElementById('totalTasks').textContent = completedTasks;
        document.getElementById('totalTime').textContent = totalTime;
        document.getElementById('activeTasks').textContent = activeTasksCount;
        document.getElementById('avgProductivity').textContent = `${avgProductivity}%`;
        
        // Mettre à jour les statistiques par agent
        this.updateAgentStats(agents, tasks);
        
        // Mettre à jour le tableau des tâches
        this.updateTasksTable(tasks);
    }

    updateAgentStats(agents, tasks) {
        const tbody = document.getElementById('agentStatsBody');
        tbody.innerHTML = '';
        
        agents.forEach(agent => {
            const agentTasks = tasks.filter(t => t.agent === agent.name);
            const completedAgentTasks = agentTasks.filter(t => t.status === 'completed');
            
            // Ajouter les tâches actives de cet agent
            let activeAgentTasksCount = 0;
            this.activeTasks.forEach(task => {
                if (task.agent === agent.name) {
                    activeAgentTasksCount++;
                }
            });
            
            // Calculer le temps total et moyen
            let totalSeconds = 0;
            completedAgentTasks.forEach(task => {
                if (task.duration && typeof task.duration === 'string') {
                    const timeParts = task.duration.split(':');
                    if (timeParts.length === 3) {
                        const hours = parseInt(timeParts[0]) || 0;
                        const minutes = parseInt(timeParts[1]) || 0;
                        const seconds = parseInt(timeParts[2]) || 0;
                        totalSeconds += hours * 3600 + minutes * 60 + seconds;
                    }
                }
            });
            
            // Ajouter le temps des tâches actives de cet agent
            this.activeTasks.forEach(task => {
                if (task.agent === agent.name && task.startTime) {
                    const elapsed = Date.now() - task.startTime - task.pausedTime;
                    totalSeconds += Math.floor(elapsed / 1000);
                }
            });
            
            const avgTimeSeconds = (completedAgentTasks.length + activeAgentTasksCount) > 0 ? 
                totalSeconds / (completedAgentTasks.length + activeAgentTasksCount) : 0;
            const avgTime = this.formatTime(avgTimeSeconds);
            
            // Calculer l'efficacité
            const efficiency = agentTasks.length > 0 ? 
                Math.round((completedAgentTasks.length / agentTasks.length) * 100) : 0;
            
            // Trouver la dernière activité
            let lastActivity = 'Aucune';
            if (completedAgentTasks.length > 0) {
                const lastTask = completedAgentTasks.reduce((latest, task) => {
                    return new Date(task.endTime) > new Date(latest.endTime) ? task : latest;
                });
                lastActivity = this.formatDate(new Date(lastTask.endTime));
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${agent.name}</strong></td>
                <td>${completedAgentTasks.length} ${activeAgentTasksCount > 0 ? `(+${activeAgentTasksCount})` : ''}</td>
                <td>${this.formatTime(totalSeconds)}</td>
                <td>${avgTime}</td>
                <td>
                    <span class="${efficiency >= 80 ? 'success' : efficiency >= 60 ? 'warning' : 'error'}">
                        ${efficiency}%
                    </span>
                </td>
                <td>${lastActivity}</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateTasksTable(tasks) {
        const tbody = document.getElementById('tasksBody');
        tbody.innerHTML = '';
        
        // Trier par date (plus récent en premier)
        const sortedTasks = [...tasks].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        sortedTasks.forEach(task => {
            const categoryColor = this.getCategoryColor(task.category);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${task.id}</td>
                <td>${task.name}</td>
                <td>
                    <span class="category-badge" style="background: ${categoryColor}; padding: 4px 8px; border-radius: 4px; color: white;">
                        ${task.category}
                    </span>
                </td>
                <td>${task.agent}</td>
                <td>${this.formatDateTime(new Date(task.startTime))}</td>
                <td>${task.endTime ? this.formatDateTime(new Date(task.endTime)) : 'En cours'}</td>
                <td>${task.duration || '00:00:00'}</td>
                <td>
                    <span class="status-badge" style="
                        padding: 4px 8px;
                        border-radius: 4px;
                        color: white;
                        background: ${task.status === 'completed' ? '#27ae60' : 
                                    task.status === 'active' ? '#3498db' : '#f39c12'};
                    ">
                        ${task.status === 'completed' ? 'Terminée' : 
                          task.status === 'active' ? 'En cours' : 'En pause'}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateCharts() {
        const tasks = this.getTasks();
        const categories = this.getCategories();
        
        // Données pour le graphique des catégories
        const categoryLabels = [];
        const categoryData = [];
        const categoryColors = [];
        
        categories.forEach(cat => {
            const catTasks = tasks.filter(t => t.category === cat.name);
            if (catTasks.length > 0) {
                categoryLabels.push(cat.name);
                categoryData.push(catTasks.length);
                categoryColors.push(cat.color);
            }
        });
        
        // Détruire l'ancien graphique s'il existe
        const categoryCanvas = document.getElementById('categoryChart');
        if (categoryCanvas.chart) {
            categoryCanvas.chart.destroy();
        }
        
        // Créer le graphique des catégories
        if (categoryLabels.length > 0) {
            const categoryCtx = categoryCanvas.getContext('2d');
            categoryCanvas.chart = new Chart(categoryCtx, {
                type: 'pie',
                data: {
                    labels: categoryLabels,
                    datasets: [{
                        data: categoryData,
                        backgroundColor: categoryColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }
        
        // Données pour le graphique de performance (7 derniers jours)
        const last7Days = [];
        const performanceData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'short' });
            last7Days.push(dateStr);
            
            const dayStart = new Date(date.setHours(0, 0, 0, 0));
            const dayEnd = new Date(date.setHours(23, 59, 59, 999));
            
            const dayTasks = tasks.filter(t => {
                const taskDate = new Date(t.startTime);
                return taskDate >= dayStart && taskDate <= dayEnd && t.status === 'completed';
            });
            
            performanceData.push(dayTasks.length);
        }
        
        // Détruire l'ancien graphique s'il existe
        const performanceCanvas = document.getElementById('performanceChart');
        if (performanceCanvas.chart) {
            performanceCanvas.chart.destroy();
        }
        
        // Créer le graphique de performance
        const performanceCtx = performanceCanvas.getContext('2d');
        performanceCanvas.chart = new Chart(performanceCtx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Tâches Terminées',
                    data: performanceData,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // ============ ONGLET 2: SUIVI TEMPS RÉEL (MULTIPLES TÂCHES) ============
    startNewTask() {
        const name = document.getElementById('taskName').value.trim();
        const category = document.getElementById('taskCategory').value;
        const agent = document.getElementById('agentName').value;
        const description = document.getElementById('taskDescription').value.trim();
        
        if (!name || !category || !agent) {
            this.showNotification('Veuillez remplir tous les champs obligatoires (*)', 'error');
            return;
        }
        
        // Créer une nouvelle tâche
        const taskId = Date.now();
        const newTask = {
            id: taskId,
            name,
            category,
            agent,
            description,
            startTime: Date.now(),
            pausedTime: 0,
            isPaused: false,
            pauseStartTime: null, // AJOUTÉ pour gérer la pause
            pauses: [],
            duration: '00:00:00',
            status: 'active'
        };
        
        // Ajouter à la liste des tâches actives
        this.activeTasks.set(taskId, newTask);
        
        // Démarrer le chronomètre pour cette tâche
        this.startTimer(taskId);
        
        // Mettre à jour l'interface
        this.updateActiveTasksList();
        this.updateRealTimeStats();
        
        // Réinitialiser le formulaire
        document.getElementById('taskForm').reset();
        
        this.showNotification(`Tâche "${name}" démarrée`, 'success');
    }

    startTimer(taskId) {
        const task = this.activeTasks.get(taskId);
        if (!task) return;
        
        task.startTime = Date.now();
        task.pausedTime = 0;
        task.isPaused = false;
        task.pauseStartTime = null; // Initialiser
        
        // Démarrer l'intervalle de mise à jour
        const intervalId = setInterval(() => {
            if (this.activeTasks.has(taskId)) {
                const currentTask = this.activeTasks.get(taskId);
                if (!currentTask.isPaused) {
                    const elapsed = Date.now() - currentTask.startTime - currentTask.pausedTime;
                    const totalSeconds = Math.floor(elapsed / 1000);
                    currentTask.duration = this.formatTime(totalSeconds);
                    
                    // Mettre à jour l'affichage pour cette tâche
                    this.updateTaskTimerDisplay(taskId, currentTask.duration);
                }
            } else {
                clearInterval(intervalId);
            }
        }, 1000);
        
        this.timerIntervals.set(taskId, intervalId);
    }

    pauseTimer(taskId) {
        const task = this.activeTasks.get(taskId);
        if (task && !task.isPaused) {
            task.isPaused = true;
            task.pauseStartTime = Date.now(); // Enregistrer le moment de la pause
            task.pauses.push({
                start: new Date().toISOString()
            });
            
            // Mettre à jour l'affichage
            this.updateTaskStatusDisplay(taskId, 'pause');
            this.showNotification(`Tâche "${task.name}" mise en pause`, 'warning');
        }
    }

    resumeTimer(taskId) {
        const task = this.activeTasks.get(taskId);
        if (task && task.isPaused) {
            // CORRECTION : Calculer le temps de pause
            if (task.pauseStartTime) {
                const pauseDuration = Date.now() - task.pauseStartTime;
                task.pausedTime += pauseDuration;
                task.pauseStartTime = null;
            }
            
            task.isPaused = false;
            
            if (task.pauses.length > 0) {
                const lastPause = task.pauses[task.pauses.length - 1];
                lastPause.end = new Date().toISOString();
            }
            
            // Mettre à jour l'affichage
            this.updateTaskStatusDisplay(taskId, 'resume');
            this.showNotification(`Tâche "${task.name}" reprise`, 'success');
        }
    }

    stopTimer(taskId) {
        const task = this.activeTasks.get(taskId);
        if (task) {
            // Arrêter l'intervalle
            const intervalId = this.timerIntervals.get(taskId);
            if (intervalId) {
                clearInterval(intervalId);
                this.timerIntervals.delete(taskId);
            }
            
            // Calculer la durée totale
            const endTime = Date.now();
            const totalSeconds = Math.floor((endTime - task.startTime - task.pausedTime) / 1000);
            
            // Créer la tâche finale
            const completedTask = {
                id: task.id,
                name: task.name,
                category: task.category,
                agent: task.agent,
                description: task.description,
                startTime: new Date(task.startTime).toISOString(),
                endTime: new Date().toISOString(),
                duration: this.formatTime(totalSeconds),
                pauses: task.pauses,
                status: 'completed'
            };
            
            // Sauvegarder la tâche
            this.saveTask(completedTask);
            
            // Supprimer de la liste des tâches actives
            this.activeTasks.delete(taskId);
            
            // Mettre à jour l'interface
            this.updateActiveTasksList();
            this.updateStatistics();
            this.updateTodayTasks();
            this.updateRealTimeStats();
            this.updateCharts();
            
            this.showNotification(`Tâche "${task.name}" terminée`, 'success');
        }
    }

    updateTaskTimerDisplay(taskId, duration) {
        const timerElement = document.querySelector(`[data-task-id="${taskId}"] .task-timer`);
        if (timerElement) {
            timerElement.textContent = duration;
        }
    }

    updateTaskStatusDisplay(taskId, action) {
        const task = this.activeTasks.get(taskId);
        if (!task) return;
        
        const statusElement = document.querySelector(`[data-task-id="${taskId}"] .task-status`);
        if (statusElement) {
            if (action === 'pause') {
                statusElement.textContent = 'En pause';
                statusElement.style.color = '#f39c12';
            } else if (action === 'resume') {
                statusElement.textContent = 'En cours';
                statusElement.style.color = '#27ae60';
            }
        }
    }

    updateActiveTasksList() {
        const container = document.getElementById('currentTaskInfo');
        if (!container) return;
        
        if (this.activeTasks.size === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <i class="fas fa-tasks" style="font-size: 48px; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>Aucune tâche en cours. Démarrez une nouvelle tâche.</p>
                </div>
            `;
            document.getElementById('todayActiveTask').textContent = 'Aucune';
            document.getElementById('todayActiveTask').classList.remove('pulse');
        } else {
            let html = '<div class="active-tasks-container">';
            html += `<h3 style="margin-bottom: 15px; color: #2c3e50;">Tâches Actives (${this.activeTasks.size})</h3>`;
            html += '<div class="active-tasks-grid">';
            
            this.activeTasks.forEach((task, taskId) => {
                const categoryColor = this.getCategoryColor(task.category);
                const isPaused = task.isPaused;
                
                html += `
                    <div class="active-task-card" data-task-id="${taskId}" style="
                        background: white;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 15px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        border-left: 4px solid ${categoryColor};
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <div>
                                <h4 style="margin: 0 0 5px 0; color: #2c3e50;">${task.name}</h4>
                                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
                                    <span style="background: ${categoryColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                                        ${task.category}
                                    </span>
                                    <span style="background: #f8f9fa; color: #666; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                                        <i class="fas fa-user"></i> ${task.agent}
                                    </span>
                                    <span class="task-status" style="
                                        color: ${isPaused ? '#f39c12' : '#27ae60'};
                                        font-weight: 500;
                                        padding: 2px 8px;
                                        border-radius: 4px;
                                        font-size: 12px;
                                        background: ${isPaused ? '#fff3cd' : '#d4edda'};
                                    ">
                                        ${isPaused ? '⏸️ En pause' : '▶️ En cours'}
                                    </span>
                                </div>
                            </div>
                            <div class="task-timer" style="
                                font-family: 'Courier New', monospace;
                                font-size: 24px;
                                font-weight: bold;
                                color: ${isPaused ? '#f39c12' : '#2c3e50'};
                            ">
                                ${task.duration}
                            </div>
                        </div>
                        
                        ${task.description ? `
                            <p style="margin: 10px 0; color: #666; font-size: 14px;">
                                <strong>Description:</strong> ${task.description}
                            </p>
                        ` : ''}
                        
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button onclick="dashboard.pauseTimer(${taskId})" 
                                ${isPaused ? 'disabled' : ''}
                                style="
                                    background: ${isPaused ? '#95a5a6' : '#f39c12'};
                                    color: white;
                                    border: none;
                                    padding: 8px 15px;
                                    border-radius: 4px;
                                    cursor: ${isPaused ? 'not-allowed' : 'pointer'};
                                    font-size: 14px;
                                    display: flex;
                                    align-items: center;
                                    gap: 5px;
                                ">
                                <i class="fas fa-pause"></i> Pause
                            </button>
                            
                            <button onclick="dashboard.resumeTimer(${taskId})" 
                                ${!isPaused ? 'disabled' : ''}
                                style="
                                    background: ${!isPaused ? '#95a5a6' : '#3498db'};
                                    color: white;
                                    border: none;
                                    padding: 8px 15px;
                                    border-radius: 4px;
                                    cursor: ${!isPaused ? 'not-allowed' : 'pointer'};
                                    font-size: 14px;
                                    display: flex;
                                    align-items: center;
                                    gap: 5px;
                                ">
                                <i class="fas fa-play"></i> Reprendre
                            </button>
                            
                            <button onclick="dashboard.stopTimer(${taskId})" 
                                style="
                                    background: #e74c3c;
                                    color: white;
                                    border: none;
                                    padding: 8px 15px;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 14px;
                                    display: flex;
                                    align-items: center;
                                    gap: 5px;
                                ">
                                <i class="fas fa-stop"></i> Terminer
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += '</div></div>';
            container.innerHTML = html;
            
            // Mettre à jour le compteur de tâches actives
            document.getElementById('todayActiveTask').textContent = `${this.activeTasks.size} tâche(s)`;
            document.getElementById('todayActiveTask').classList.add('pulse');
        }
    }

    updateTodayTasks() {
        const today = new Date().toDateString();
        const tasks = this.getTasks().filter(task => 
            new Date(task.startTime).toDateString() === today
        );
        
        // Ajouter les tâches actives du jour
        const activeTasksToday = Array.from(this.activeTasks.values())
            .filter(task => new Date(task.startTime).toDateString() === today);
        
        const tbody = document.getElementById('todayTasksBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Combiner les tâches terminées et actives
        const allTasksToday = [...tasks, ...activeTasksToday.map(task => ({
            ...task,
            endTime: null,
            duration: task.duration
        }))];
        
        // Trier par heure de début (plus récent en premier)
        const sortedTasks = allTasksToday.sort((a, b) => {
            const dateA = new Date(a.startTime || a.startTime);
            const dateB = new Date(b.startTime || b.startTime);
            return dateB - dateA;
        });
        
        sortedTasks.forEach(task => {
            const categoryColor = this.getCategoryColor(task.category);
            const isActive = this.activeTasks.has(task.id);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    ${task.name}
                    ${isActive ? '<span style="color: #3498db; font-size: 10px; margin-left: 5px;">(Active)</span>' : ''}
                </td>
                <td>
                    <span style="color: ${categoryColor}; font-weight: 500;">${task.category}</span>
                </td>
                <td>${task.agent}</td>
                <td>${this.formatTime(new Date(task.startTime))}</td>
                <td>${task.endTime ? this.formatTime(new Date(task.endTime)) : 'En cours'}</td>
                <td>${task.duration || '00:00:00'}</td>
                <td>
                    ${isActive ? `
                        <div style="display: flex; gap: 5px;">
                            <button onclick="dashboard.pauseTimer(${task.id})" 
                                style="background: #f39c12; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">
                                <i class="fas fa-pause"></i>
                            </button>
                            <button onclick="dashboard.stopTimer(${task.id})" 
                                style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">
                                <i class="fas fa-stop"></i>
                            </button>
                        </div>
                    ` : `
                        <button onclick="dashboard.deleteTask(${task.id})" style="
                            background: #e74c3c;
                            color: white;
                            border: none;
                            padding: 5px 10px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 12px;
                        ">
                            <i class="fas fa-trash"></i>
                        </button>
                    `}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateRealTimeStats() {
        const today = new Date().toDateString();
        const tasks = this.getTasks().filter(task => 
            new Date(task.startTime).toDateString() === today && task.status === 'completed'
        );
        
        const completedTasks = tasks.length;
        const activeTasksCount = this.activeTasks.size;
        
        // Calculer le temps total du jour (tâches terminées)
        let totalSeconds = 0;
        tasks.forEach(task => {
            if (task.duration && typeof task.duration === 'string') {
                const timeParts = task.duration.split(':');
                if (timeParts.length === 3) {
                    const hours = parseInt(timeParts[0]) || 0;
                    const minutes = parseInt(timeParts[1]) || 0;
                    const seconds = parseInt(timeParts[2]) || 0;
                    totalSeconds += hours * 3600 + minutes * 60 + seconds;
                }
            }
        });
        
        // Ajouter le temps des tâches actives du jour
        this.activeTasks.forEach(task => {
            if (new Date(task.startTime).toDateString() === today) {
                const elapsed = Date.now() - task.startTime - task.pausedTime;
                totalSeconds += Math.floor(elapsed / 1000);
            }
        });
        
        const todayCompleted = document.getElementById('todayCompletedTasks');
        const todayTotalTime = document.getElementById('todayTotalTime');
        
        if (todayCompleted) todayCompleted.textContent = completedTasks;
        if (todayTotalTime) todayTotalTime.textContent = this.formatTime(totalSeconds);
    }

    // ============ GESTION DES TÂCHES ACTIVES ============
    restoreActiveTasks() {
        try {
            const savedActiveTasks = JSON.parse(localStorage.getItem('qwanteos_active_tasks') || '[]');
            
            savedActiveTasks.forEach(savedTask => {
                // Recalculer le temps écoulé depuis la pause
                if (savedTask.startTime) {
                    const savedStartTime = new Date(savedTask.startTime).getTime();
                    const now = Date.now();
                    
                    // Ajuster le pausedTime pour le temps écoulé depuis la dernière sauvegarde
                    if (savedTask.isPaused) {
                        const timeSincePause = now - savedStartTime - savedTask.pausedTime;
                        savedTask.pausedTime += timeSincePause;
                    }
                    
                    // Redémarrer le timer
                    this.activeTasks.set(savedTask.id, savedTask);
                    this.startTimer(savedTask.id);
                    
                    // Si la tâche était en pause, mettre à jour l'état
                    if (savedTask.isPaused) {
                        setTimeout(() => {
                            this.updateTaskStatusDisplay(savedTask.id, 'pause');
                        }, 100);
                    }
                }
            });
            
            // Mettre à jour l'interface
            if (this.activeTasks.size > 0) {
                setTimeout(() => {
                    this.updateActiveTasksList();
                    this.updateRealTimeStats();
                }, 500);
            }
        } catch (error) {
            console.error('Erreur de restauration des tâches actives:', error);
        }
    }

    saveActiveTasks() {
        try {
            const tasksToSave = Array.from(this.activeTasks.values()).map(task => ({
                ...task,
                startTime: new Date(task.startTime).toISOString()
            }));
            localStorage.setItem('qwanteos_active_tasks', JSON.stringify(tasksToSave));
        } catch (error) {
            console.error('Erreur de sauvegarde des tâches actives:', error);
        }
    }

    // ============ ONGLET 3: PARAMÈTRES ============
    loadAgentsToSelect() {
        const agents = this.getAgents();
        const select = document.getElementById('agentName');
        if (!select) return;
        
        select.innerHTML = '<option value="">Sélectionner un agent</option>';
        
        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.name;
            option.textContent = agent.name;
            select.appendChild(option);
        });
    }

    loadCategories() {
        const categories = this.getCategories();
        const select = document.getElementById('taskCategory');
        const categoriesDiv = document.getElementById('categoriesList');
        
        if (!select || !categoriesDiv) return;
        
        // Mettre à jour le sélecteur
        select.innerHTML = '<option value="">Sélectionner une catégorie</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            select.appendChild(option);
        });
        
        // Mettre à jour la liste d'affichage
        categoriesDiv.innerHTML = '';
        categories.forEach(cat => {
            const div = document.createElement('div');
            div.className = 'category-item';
            div.style.cssText = `
                display: inline-block;
                padding: 8px 15px;
                margin: 5px;
                background: #f8f9fa;
                border-radius: 20px;
                border-left: 4px solid ${cat.color};
            `;
            div.innerHTML = `
                <span style="color: ${cat.color}">■</span> ${cat.name}
                <button onclick="dashboard.deleteCategory(${cat.id})" style="
                    background: #e74c3c;
                    color: white;
                    border: none;
                    padding: 3px 8px;
                    border-radius: 3px;
                    cursor: pointer;
                    margin-left: 8px;
                    font-size: 12px;
                ">
                    <i class="fas fa-times"></i>
                </button>
            `;
            categoriesDiv.appendChild(div);
        });
    }

    addAgent() {
        const nameInput = document.getElementById('newAgentName');
        const emailInput = document.getElementById('newAgentEmail');
        const departmentInput = document.getElementById('newAgentDepartment');
        
        if (!nameInput || !emailInput || !departmentInput) return;
        
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const department = departmentInput.value.trim();
        
        if (!name) {
            this.showNotification('Le nom de l\'agent est obligatoire', 'error');
            return;
        }
        
        const agents = this.getAgents();
        
        // Vérifier si l'agent existe déjà
        if (agents.some(agent => agent.name.toLowerCase() === name.toLowerCase())) {
            this.showNotification('Cet agent existe déjà', 'error');
            return;
        }
        
        const newAgent = {
            id: Date.now(),
            name,
            email,
            department,
            date: new Date().toISOString()
        };
        
        agents.push(newAgent);
        localStorage.setItem('qwanteos_agents', JSON.stringify(agents));
        
        // Mettre à jour l'interface
        this.loadAgentsToSelect();
        this.updateAgentsList();
        
        // Réinitialiser le formulaire
        nameInput.value = '';
        emailInput.value = '';
        departmentInput.value = '';
        
        this.showNotification('Agent ajouté avec succès', 'success');
    }

    addCategory() {
        const nameInput = document.getElementById('newCategoryName');
        const colorInput = document.getElementById('newCategoryColor');
        
        if (!nameInput || !colorInput) return;
        
        const name = nameInput.value.trim();
        const color = colorInput.value;
        
        if (!name) {
            this.showNotification('Le nom de la catégorie est obligatoire', 'error');
            return;
        }
        
        const categories = this.getCategories();
        
        // Vérifier si la catégorie existe déjà
        if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            this.showNotification('Cette catégorie existe déjà', 'error');
            return;
        }
        
        const newCategory = {
            id: Date.now(),
            name,
            color
        };
        
        categories.push(newCategory);
        localStorage.setItem('qwanteos_categories', JSON.stringify(categories));
        
        // Mettre à jour l'interface
        this.loadCategories();
        
        // Réinitialiser le formulaire
        nameInput.value = '';
        
        this.showNotification('Catégorie ajoutée avec succès', 'success');
    }

    updateAgentsList() {
        const agents = this.getAgents();
        const tbody = document.getElementById('agentsListBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        agents.forEach(agent => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${agent.name}</strong></td>
                <td>${agent.email || '-'}</td>
                <td>${agent.department || '-'}</td>
                <td>${this.formatDate(new Date(agent.date))}</td>
                <td>
                    <button onclick="dashboard.deleteAgent(${agent.id})" style="
                        background: #e74c3c;
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    ">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    deleteAgent(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet agent ?')) {
            let agents = this.getAgents();
            agents = agents.filter(agent => agent.id !== id);
            localStorage.setItem('qwanteos_agents', JSON.stringify(agents));
            
            this.updateAgentsList();
            this.loadAgentsToSelect();
            this.showNotification('Agent supprimé', 'success');
        }
    }

    deleteCategory(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
            let categories = this.getCategories();
            categories = categories.filter(cat => cat.id !== id);
            localStorage.setItem('qwanteos_categories', JSON.stringify(categories));
            
            this.loadCategories();
            this.showNotification('Catégorie supprimée', 'success');
        }
    }

    deleteTask(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
            let tasks = this.getTasks();
            tasks = tasks.filter(task => task.id !== id);
            localStorage.setItem('qwanteos_tasks', JSON.stringify(tasks));
            
            this.updateStatistics();
            this.updateTodayTasks();
            this.updateCharts();
            this.showNotification('Tâche supprimée', 'success');
        }
    }

    loadSettings() {
        const settings = this.getSettings();
        
        // Appliquer les paramètres
        const themeSelect = document.getElementById('dashboardTheme');
        const timeFormatSelect = document.getElementById('timeFormat');
        const autoSaveSelect = document.getElementById('autoSave');
        
        if (themeSelect) themeSelect.value = settings.theme || 'light';
        if (timeFormatSelect) timeFormatSelect.value = settings.timeFormat || '24';
        if (autoSaveSelect) autoSaveSelect.value = settings.autoSave || '5';
        
        // Appliquer le thème
        this.changeTheme(settings.theme || 'light');
        
        // Mettre à jour la dernière sauvegarde
        const lastBackup = document.getElementById('lastBackup');
        if (lastBackup && settings.lastBackup) {
            lastBackup.textContent = new Date(settings.lastBackup).toLocaleString('fr-FR');
        }
    }

    saveSettings() {
        const theme = document.getElementById('dashboardTheme').value;
        const timeFormat = document.getElementById('timeFormat').value;
        const autoSave = document.getElementById('autoSave').value;
        
        const settings = {
            theme,
            timeFormat,
            autoSave,
            lastBackup: new Date().toISOString()
        };
        
        localStorage.setItem('qwanteos_settings', JSON.stringify(settings));
        
        // Appliquer le thème
        this.changeTheme(theme);
        
        // Mettre à jour la dernière sauvegarde
        const lastBackup = document.getElementById('lastBackup');
        if (lastBackup) {
            lastBackup.textContent = new Date().toLocaleString('fr-FR');
        }
        
        this.showNotification('Paramètres sauvegardés', 'success');
    }

    changeTheme(theme) {
        this.theme = theme;
        document.body.setAttribute('data-theme', theme);
        
        // Mettre à jour les couleurs selon le thème
        const root = document.documentElement;
        if (theme === 'dark') {
            root.style.setProperty('--light-color', '#2c3e50');
            root.style.setProperty('--dark-color', '#ecf0f1');
            root.style.setProperty('--border-color', '#34495e');
            document.body.style.backgroundColor = '#1a1a2e';
            document.body.style.color = '#ecf0f1';
        } else if (theme === 'blue') {
            root.style.setProperty('--primary-color', '#1e3a8a');
            root.style.setProperty('--secondary-color', '#3b82f6');
            document.body.style.backgroundColor = '#f0f9ff';
        } else {
            // Theme clair par défaut
            root.style.setProperty('--light-color', '#ecf0f1');
            root.style.setProperty('--dark-color', '#2c3e50');
            root.style.setProperty('--border-color', '#ddd');
            root.style.setProperty('--primary-color', '#2c3e50');
            root.style.setProperty('--secondary-color', '#3498db');
            document.body.style.backgroundColor = '#f5f7fa';
            document.body.style.color = '#333';
        }
    }

    // ============ FONCTIONS UTILITAIRES ============
    getAgents() {
        try {
            return JSON.parse(localStorage.getItem('qwanteos_agents') || '[]');
        } catch (error) {
            console.error('Erreur de lecture des agents:', error);
            return [];
        }
    }

    getCategories() {
        try {
            return JSON.parse(localStorage.getItem('qwanteos_categories') || '[]');
        } catch (error) {
            console.error('Erreur de lecture des catégories:', error);
            return [];
        }
    }

    getTasks() {
        try {
            return JSON.parse(localStorage.getItem('qwanteos_tasks') || '[]');
        } catch (error) {
            console.error('Erreur de lecture des tâches:', error);
            return [];
        }
    }

    getSettings() {
        try {
            return JSON.parse(localStorage.getItem('qwanteos_settings') || '{}');
        } catch (error) {
            console.error('Erreur de lecture des paramètres:', error);
            return {};
        }
    }

    saveTask(task) {
        try {
            const tasks = this.getTasks();
            tasks.push(task);
            localStorage.setItem('qwanteos_tasks', JSON.stringify(tasks));
            return true;
        } catch (error) {
            console.error('Erreur de sauvegarde de la tâche:', error);
            this.showNotification('Erreur de sauvegarde', 'error');
            return false;
        }
    }

    getCategoryColor(categoryName) {
        const categories = this.getCategories();
        const category = categories.find(cat => cat.name === categoryName);
        return category ? category.color : '#3498db';
    }

    formatTime(totalSeconds) {
        if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) {
            return '00:00:00';
        }
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    formatDate(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            return '-';
        }
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatDateTime(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            return '-';
        }
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const currentDate = document.getElementById('currentDate');
        if (currentDate) {
            currentDate.textContent = now.toLocaleDateString('fr-FR', options);
        }
    }

    updateRealTime() {
        const now = new Date();
        const currentTime = document.getElementById('currentTime');
        if (currentTime) {
            currentTime.textContent = now.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    updateSystemInfo() {
        try {
            const tasks = this.getTasks();
            const agents = this.getAgents();
            const categories = this.getCategories();
            
            // Calculer la taille des données
            let totalSize = 0;
            ['qwanteos_tasks', 'qwanteos_agents', 'qwanteos_categories', 'qwanteos_settings', 'qwanteos_active_tasks'].forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    totalSize += new Blob([data]).size;
                }
            });
            
            const dataSize = document.getElementById('dataSize');
            const totalRecords = document.getElementById('totalRecords');
            const lastUpdate = document.getElementById('lastUpdate');
            
            if (dataSize) dataSize.textContent = `${Math.round(totalSize / 1024)} KB`;
            if (totalRecords) totalRecords.textContent = tasks.length + this.activeTasks.size;
            if (lastUpdate) lastUpdate.textContent = new Date().toLocaleTimeString('fr-FR');
        } catch (error) {
            console.error('Erreur de mise à jour des informations système:', error);
        }
    }

    autoSave() {
        try {
            // Sauvegarder les tâches actives
            this.saveActiveTasks();
            
            // Mettre à jour la dernière sauvegarde dans les paramètres
            const settings = this.getSettings();
            settings.lastBackup = new Date().toISOString();
            localStorage.setItem('qwanteos_settings', JSON.stringify(settings));
            
            // Mettre à jour l'affichage
            const lastBackup = document.getElementById('lastBackup');
            if (lastBackup) {
                lastBackup.textContent = new Date().toLocaleTimeString('fr-FR');
            }
            
            this.showNotification('Sauvegarde automatique effectuée', 'success');
        } catch (error) {
            console.error('Erreur de sauvegarde automatique:', error);
        }
    }

    exportData() {
        try {
            const data = {
                tasks: this.getTasks(),
                agents: this.getAgents(),
                categories: this.getCategories(),
                settings: this.getSettings(),
                activeTasks: Array.from(this.activeTasks.values()),
                exportDate: new Date().toISOString()
            };
            
            // Créer un fichier Excel
            const ws = XLSX.utils.json_to_sheet(this.getTasks());
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Tâches");
            
            // Ajouter une feuille pour les tâches actives
            const activeWs = XLSX.utils.json_to_sheet(Array.from(this.activeTasks.values()));
            XLSX.utils.book_append_sheet(wb, activeWs, "Tâches Actives");
            
            // Nom du fichier avec date
            const dateStr = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `qwanteos_export_${dateStr}.xlsx`);
            
            this.showNotification('Données exportées avec succès', 'success');
        } catch (error) {
            console.error('Erreur d\'export:', error);
            this.showNotification('Erreur lors de l\'export', 'error');
        }
    }

    backupData() {
        try {
            const backup = {
                version: '2.0.1',
                timestamp: new Date().toISOString(),
                data: {
                    tasks: this.getTasks(),
                    agents: this.getAgents(),
                    categories: this.getCategories(),
                    settings: this.getSettings(),
                    activeTasks: Array.from(this.activeTasks.values())
                }
            };
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qwanteos_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Sauvegarde créée avec succès', 'success');
        } catch (error) {
            console.error('Erreur de sauvegarde:', error);
            this.showNotification('Erreur lors de la sauvegarde', 'error');
        }
    }

    restoreData() {
        try {
            const fileInput = document.getElementById('restoreFile');
            if (!fileInput || !fileInput.files.length) {
                this.showNotification('Veuillez sélectionner un fichier', 'error');
                return;
            }
            
            const file = fileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    
                    // Arrêter toutes les tâches actives
                    this.activeTasks.forEach((task, taskId) => {
                        this.stopTimer(taskId);
                    });
                    this.activeTasks.clear();
                    
                    // Restaurer les données
                    if (backup.data.tasks) {
                        localStorage.setItem('qwanteos_tasks', JSON.stringify(backup.data.tasks));
                    }
                    if (backup.data.agents) {
                        localStorage.setItem('qwanteos_agents', JSON.stringify(backup.data.agents));
                    }
                    if (backup.data.categories) {
                        localStorage.setItem('qwanteos_categories', JSON.stringify(backup.data.categories));
                    }
                    if (backup.data.settings) {
                        localStorage.setItem('qwanteos_settings', JSON.stringify(backup.data.settings));
                    }
                    if (backup.data.activeTasks) {
                        localStorage.setItem('qwanteos_active_tasks', JSON.stringify(backup.data.activeTasks));
                        // Restaurer les tâches actives
                        backup.data.activeTasks.forEach(task => {
                            this.activeTasks.set(task.id, {
                                ...task,
                                startTime: new Date(task.startTime).getTime()
                            });
                            this.startTimer(task.id);
                        });
                    }
                    
                    // Recharger l'interface
                    this.initUI();
                    this.loadAgentsToSelect();
                    this.loadCategories();
                    this.loadSettings();
                    
                    this.showNotification('Données restaurées avec succès', 'success');
                } catch (parseError) {
                    console.error('Erreur d\'analyse du fichier:', parseError);
                    this.showNotification('Format de fichier invalide', 'error');
                }
            };
            
            reader.onerror = () => {
                this.showNotification('Erreur de lecture du fichier', 'error');
            };
            
            reader.readAsText(file);
        } catch (error) {
            console.error('Erreur de restauration:', error);
            this.showNotification('Erreur lors de la restauration', 'error');
        }
    }

    clearOldData() {
        if (confirm('Voulez-vous vraiment supprimer les tâches de plus de 30 jours ?')) {
            try {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                let tasks = this.getTasks();
                const oldCount = tasks.length;
                
                tasks = tasks.filter(task => {
                    const taskDate = new Date(task.startTime);
                    return taskDate >= thirtyDaysAgo;
                });
                
                localStorage.setItem('qwanteos_tasks', JSON.stringify(tasks));
                
                this.updateStatistics();
                this.updateTodayTasks();
                this.updateCharts();
                
                const deletedCount = oldCount - tasks.length;
                this.showNotification(`${deletedCount} anciennes tâches supprimées`, 'success');
            } catch (error) {
                console.error('Erreur de nettoyage:', error);
                this.showNotification('Erreur lors du nettoyage', 'error');
            }
        }
    }

    resetDashboard() {
        if (confirm('Voulez-vous vraiment réinitialiser le dashboard ? Toutes les données seront perdues.')) {
            try {
                // Arrêter toutes les tâches actives
                this.activeTasks.forEach((task, taskId) => {
                    const intervalId = this.timerIntervals.get(taskId);
                    if (intervalId) {
                        clearInterval(intervalId);
                    }
                });
                this.activeTasks.clear();
                this.timerIntervals.clear();
                
                // Supprimer toutes les données
                localStorage.removeItem('qwanteos_tasks');
                localStorage.removeItem('qwanteos_agents');
                localStorage.removeItem('qwanteos_categories');
                localStorage.removeItem('qwanteos_settings');
                localStorage.removeItem('qwanteos_active_tasks');
                
                // Réinitialiser le stockage
                this.initStorage();
                
                // Recharger l'interface
                this.initUI();
                this.loadAgentsToSelect();
                this.loadCategories();
                this.loadSettings();
                
                this.showNotification('Dashboard réinitialisé avec succès', 'success');
            } catch (error) {
                console.error('Erreur de réinitialisation:', error);
                this.showNotification('Erreur lors de la réinitialisation', 'error');
            }
        }
    }

    showNotification(message, type) {
        try {
            // Supprimer les notifications existantes
            document.querySelectorAll('.notification').forEach(n => n.remove());
            
            // Déterminer l'icône selon le type
            let icon = 'info-circle';
            let bgColor = '#3498db';
            
            switch (type) {
                case 'success':
                    icon = 'check-circle';
                    bgColor = '#27ae60';
                    break;
                case 'error':
                    icon = 'exclamation-circle';
                    bgColor = '#e74c3c';
                    break;
                case 'warning':
                    icon = 'exclamation-triangle';
                    bgColor = '#f39c12';
                    break;
            }
            
            // Créer une nouvelle notification
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 1000;
                animation: slideIn 0.3s ease;
                border-left: 4px solid ${bgColor};
            `;
            
            notification.innerHTML = `
                <i class="fas fa-${icon}" style="color: ${bgColor}; font-size: 20px;"></i>
                <span style="color: #2c3e50; font-weight: 500;">${message}</span>
            `;
            
            document.body.appendChild(notification);
            
            // Supprimer après 5 secondes
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 5000);
            
            // Ajouter l'animation de sortie
            if (!document.querySelector('#notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
        } catch (error) {
            console.error('Erreur d\'affichage de notification:', error);
        }
    }
}

// Fonctions globales pour les événements
function startNewTask() { 
    if (window.dashboard) window.dashboard.startNewTask(); 
}
function pauseTimer(taskId) { 
    if (window.dashboard) window.dashboard.pauseTimer(taskId); 
}
function resumeTimer(taskId) { 
    if (window.dashboard) window.dashboard.resumeTimer(taskId); 
}
function stopTimer(taskId) { 
    if (window.dashboard) window.dashboard.stopTimer(taskId); 
}
function addAgent() { 
    if (window.dashboard) window.dashboard.addAgent(); 
}
function addCategory() { 
    if (window.dashboard) window.dashboard.addCategory(); 
}
function saveSettings() { 
    if (window.dashboard) window.dashboard.saveSettings(); 
}
function exportData() { 
    if (window.dashboard) window.dashboard.exportData(); 
}
function backupData() { 
    if (window.dashboard) window.dashboard.backupData(); 
}
function restoreData() { 
    if (window.dashboard) window.dashboard.restoreData(); 
}
function clearOldData() { 
    if (window.dashboard) window.dashboard.clearOldData(); 
}
function resetDashboard() { 
    if (window.dashboard) window.dashboard.resetDashboard(); 
}
function changeTheme(value) { 
    if (window.dashboard) window.dashboard.changeTheme(value); 
}

// Filtrer par date
function applyDateFilter() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    
    if (window.dashboard) {
        window.dashboard.showNotification('Filtre appliqué', 'success');
        // Ici vous pouvez implémenter la logique de filtrage
    }
}

function resetFilter() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    if (window.dashboard) {
        window.dashboard.showNotification('Filtre réinitialisé', 'success');
    }
}

// Gestionnaire d'import de fichier
document.addEventListener('DOMContentLoaded', () => {
    const restoreFileInput = document.getElementById('restoreFile');
    if (restoreFileInput) {
        restoreFileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                const fileName = this.files[0].name;
                const uploadBtn = document.querySelector('.btn-restore');
                if (uploadBtn) {
                    uploadBtn.innerHTML = `<i class="fas fa-file-import"></i> ${fileName}`;
                }
            }
        });
    }
});

// Initialiser le dashboard lorsque la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});