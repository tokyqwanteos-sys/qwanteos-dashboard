// Google Sheets Sync pour SETUP QWANTEOS - VERSION SANS ÉCRASEMENT
class GoogleSheetsSync {
    constructor() {
        this.scriptUrl = 'https://script.google.com/macros/s/AKfycbzNiGC18yYn-jzp4Qd8cmSMiCDuptYZlpdSoQIgy8okOvvi6ZWKfuM5EW4pbrexc030zg/exec';
        this.apiKey = 'SETUP_QWANTEOS_2024';
        this.isEnabled = false;
        this.syncInterval = null;
        this.dashboardId = this.generateDashboardId();
        this.initialize();
    }

    generateDashboardId() {
        let id = localStorage.getItem('qwanteos_dashboard_id');
        if (!id) {
            // Générer un ID unique basé sur timestamp + random
            id = 'DASH_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            localStorage.setItem('qwanteos_dashboard_id', id);
        }
        return id;
    }

    initialize() {
        const saved = localStorage.getItem('qwanteos_sync_enabled');
        this.isEnabled = saved === 'true';
        
        if (this.isEnabled) {
            this.startAutoSync();
        }
        
        this.updateUI();
    }

    enable() {
        this.isEnabled = true;
        localStorage.setItem('qwanteos_sync_enabled', 'true');
        this.startAutoSync();
        this.updateUI();
        return true;
    }

    disable() {
        this.isEnabled = false;
        localStorage.setItem('qwanteos_sync_enabled', 'false');
        this.stopAutoSync();
        this.updateUI();
        return true;
    }

    startAutoSync() {
        this.stopAutoSync();
        
        // Sync toutes les 60 secondes (plus lent pour éviter conflits)
        this.syncInterval = setInterval(() => {
            this.syncAllDataSafe();
        }, 60000);
        
        // Première sync immédiate
        setTimeout(() => this.syncAllDataSafe(), 2000);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async syncAllDataSafe() {
        if (!this.isEnabled || !window.dashboard) return;
        
        try {
            const allData = {
                tasks: window.dashboard.getTasks(),
                agents: window.dashboard.getAgents(),
                timestamp: new Date().toISOString(),
                dashboardId: this.dashboardId
            };

            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'syncAll',
                    data: allData,
                    apiKey: this.apiKey
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showStatus('success', `Ajouté: ${result.addedTasks || 0} tâches, ${result.addedAgents || 0} agents`);
                console.log('✅ Sync sécurisée:', result.message);
            } else {
                this.showStatus('error', 'Erreur: ' + (result.error || 'Inconnue'));
            }
        } catch (error) {
            console.error('❌ Erreur sync:', error);
            this.showStatus('error', 'Hors ligne');
        }
    }

    async syncNow() {
        if (!window.dashboard) return false;
        
        try {
            const allData = {
                tasks: window.dashboard.getTasks(),
                agents: window.dashboard.getAgents(),
                timestamp: new Date().toISOString(),
                dashboardId: this.dashboardId
            };

            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'syncAll',
                    data: allData,
                    apiKey: this.apiKey
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showStatus('success', `Sync manuelle: ${result.message}`);
                return true;
            } else {
                this.showStatus('error', 'Erreur: ' + (result.error || 'Inconnue'));
                return false;
            }
        } catch (error) {
            console.error('Erreur sync manuelle:', error);
            this.showStatus('error', 'Erreur réseau');
            return false;
        }
    }

    async loadFromSheets() {
        if (!window.dashboard) return false;
        
        try {
            const response = await fetch(`${this.scriptUrl}?action=getAll&apiKey=${this.apiKey}`);
            const data = await response.json();
            
            if (data.tasks && data.agents) {
                // Fusion intelligente : ne pas écraser les données locales
                const localTasks = window.dashboard.getTasks();
                const localAgents = window.dashboard.getAgents();
                
                // Créer des Sets pour vérifier les doublons
                const localTaskIds = new Set(localTasks.map(t => t.id.toString()));
                const localAgentIds = new Set(localAgents.map(a => a.id.toString()));
                
                // Filtrer les nouvelles données
                const newTasks = data.tasks.filter(task => !localTaskIds.has(task.ID.toString()));
                const newAgents = data.agents.filter(agent => !localAgentIds.has(agent.ID.toString()));
                
                // Ajouter seulement les nouvelles données
                if (newTasks.length > 0) {
                    const allTasks = [...localTasks, ...newTasks.map(task => ({
                        id: task.ID,
                        name: task['Nom Tâche'],
                        category: task.Catégorie,
                        agent: task.Agent,
                        startTime: task['Date Début'],
                        endTime: task['Date Fin'] || null,
                        duration: task.Durée || '00:00:00',
                        status: task.Statut,
                        description: task.Description || ''
                    }))];
                    localStorage.setItem('qwanteos_tasks', JSON.stringify(allTasks));
                }
                
                if (newAgents.length > 0) {
                    const allAgents = [...localAgents, ...newAgents.map(agent => ({
                        id: agent.ID,
                        name: agent.Nom,
                        email: agent.Email || '',
                        department: agent.Département || '',
                        date: agent['Date Ajout'] || new Date().toISOString()
                    }))];
                    localStorage.setItem('qwanteos_agents', JSON.stringify(allAgents));
                }
                
                // Rafraîchir le dashboard
                window.dashboard.updateStatistics();
                window.dashboard.updateCharts();
                window.dashboard.loadAgentsToSelect();
                window.dashboard.updateTodayTasks();
                
                this.showStatus('success', `Chargé: ${newTasks.length} nouvelles tâches, ${newAgents.length} nouveaux agents`);
                return true;
            }
        } catch (error) {
            console.error('Erreur chargement:', error);
            this.showStatus('error', 'Erreur chargement');
        }
        return false;
    }

    showStatus(type, message) {
        const statusElement = document.getElementById('syncStatus');
        if (statusElement) {
            const icon = type === 'success' ? '✅' : '❌';
            statusElement.innerHTML = `<span style="color: ${type === 'success' ? '#27ae60' : '#e74c3c'}">${icon} ${message}</span>`;
        }
        
        const timeElement = document.getElementById('lastSyncTime');
        if (timeElement && type === 'success') {
            timeElement.textContent = new Date().toLocaleTimeString();
        }
    }

    updateUI() {
        const modeElement = document.getElementById('syncMode');
        if (modeElement) {
            modeElement.textContent = this.isEnabled ? 'Activé' : 'Désactivé';
            modeElement.style.color = this.isEnabled ? '#27ae60' : '#e74c3c';
        }
    }
}

// Initialiser
window.googleSync = new GoogleSheetsSync();

// Fonctions globales pour les boutons
function enableCloudSync() {
    if (window.googleSync.enable()) {
        if (window.dashboard) {
            window.dashboard.showNotification('Synchronisation sécurisée activée', 'success');
        }
    }
}

function disableCloudSync() {
    if (window.googleSync.disable()) {
        if (window.dashboard) {
            window.dashboard.showNotification('Synchronisation désactivée', 'warning');
        }
    }
}

function syncNow() {
    if (window.dashboard) {
        window.dashboard.showNotification('Synchronisation sécurisée en cours...', 'info');
    }
    
    window.googleSync.syncNow().then(success => {
        if (window.dashboard) {
            if (success) {
                window.dashboard.showNotification('Synchronisation terminée sans écrasement', 'success');
            } else {
                window.dashboard.showNotification('Erreur de synchronisation', 'error');
            }
        }
    });
}

function loadFromSheets() {
    if (window.dashboard) {
        window.dashboard.showNotification('Chargement sécurisé depuis Google Sheets...', 'info');
    }
    
    window.googleSync.loadFromSheets().then(success => {
        if (window.dashboard) {
            if (success) {
                window.dashboard.showNotification('Données fusionnées avec succès', 'success');
            } else {
                window.dashboard.showNotification('Erreur de chargement', 'error');
            }
        }
    });
}