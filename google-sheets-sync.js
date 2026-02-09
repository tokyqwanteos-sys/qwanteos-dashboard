// Google Sheets Sync pour SETUP QWANTEOS
class GoogleSheetsSync {
    constructor() {
        this.scriptUrl = 'https://script.google.com/macros/s/AKfycbya0Uq_S3eXCTF-rjJc_qmEH4Eb7sQ1sSeWrxspIJL4N0GT0cYfzhXnHkK4NBlWoZTwHw/exec';
        this.apiKey = 'SETUP_QWANTEOS_2024';
        this.isEnabled = false;
        this.syncInterval = null;
        this.initialize();
    }

    initialize() {
        // Vérifier si la sync est déjà activée
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
        
        // Sync toutes les 30 secondes
        this.syncInterval = setInterval(() => {
            this.syncAllData();
        }, 30000);
        
        // Première sync immédiate
        setTimeout(() => this.syncAllData(), 1000);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async syncAllData() {
        if (!this.isEnabled || !window.dashboard) return;
        
        try {
            const allData = {
                tasks: window.dashboard.getTasks(),
                agents: window.dashboard.getAgents(),
                timestamp: new Date().toISOString()
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
                this.showStatus('success', `Sync: ${result.message}`);
                console.log('✅ Sync réussie:', result.message);
            } else {
                this.showStatus('error', 'Erreur: ' + (result.error || 'Inconnue'));
            }
        } catch (error) {
            console.error('❌ Erreur sync:', error);
            this.showStatus('error', 'Hors ligne');
        }
    }

    async syncTask(task) {
        if (!this.isEnabled) return false;
        
        try {
            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'syncTask',
                    task: task,
                    apiKey: this.apiKey
                })
            });

            const result = await response.json();
            return result.success;
            
        } catch (error) {
            console.error('Erreur sync task:', error);
            return false;
        }
    }

    async syncAgent(agent) {
        if (!this.isEnabled) return false;
        
        try {
            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'syncAgent',
                    agent: agent,
                    apiKey: this.apiKey
                })
            });

            const result = await response.json();
            return result.success;
            
        } catch (error) {
            console.error('Erreur sync agent:', error);
            return false;
        }
    }

    async syncNow() {
        if (!window.dashboard) return false;
        
        try {
            const allData = {
                tasks: window.dashboard.getTasks(),
                agents: window.dashboard.getAgents(),
                timestamp: new Date().toISOString()
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
                // Fusionner avec les données locales
                localStorage.setItem('qwanteos_tasks', JSON.stringify(data.tasks));
                localStorage.setItem('qwanteos_agents', JSON.stringify(data.agents));
                
                // Rafraîchir le dashboard
                window.dashboard.updateStatistics();
                window.dashboard.updateCharts();
                window.dashboard.loadAgentsToSelect();
                window.dashboard.updateTodayTasks();
                
                this.showStatus('success', `Données chargées: ${data.tasks.length} tâches, ${data.agents.length} agents`);
                return true;
            }
        } catch (error) {
            console.error('Erreur chargement:', error);
            this.showStatus('error', 'Erreur chargement');
        }
        return false;
    }

    async loadStats() {
        try {
            const response = await fetch(`${this.scriptUrl}?action=getStats&apiKey=${this.apiKey}`);
            const data = await response.json();
            
            if (data && Array.isArray(data)) {
                console.log('📊 Statistiques Sheets:', data);
                return data;
            }
        } catch (error) {
            console.error('Erreur chargement stats:', error);
        }
        return null;
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
            window.dashboard.showNotification('Synchronisation Google Sheets activée', 'success');
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
        window.dashboard.showNotification('Synchronisation en cours...', 'info');
    }
    
    window.googleSync.syncNow().then(success => {
        if (window.dashboard) {
            if (success) {
                window.dashboard.showNotification('Synchronisation terminée avec succès', 'success');
            } else {
                window.dashboard.showNotification('Erreur de synchronisation', 'error');
            }
        }
    });
}

function loadFromSheets() {
    if (window.dashboard) {
        window.dashboard.showNotification('Chargement depuis Google Sheets...', 'info');
    }
    
    window.googleSync.loadFromSheets().then(success => {
        if (window.dashboard) {
            if (success) {
                window.dashboard.showNotification('Données chargées avec succès', 'success');
            } else {
                window.dashboard.showNotification('Erreur de chargement', 'error');
            }
        }
    });
}

function loadStatsFromSheets() {
    if (window.dashboard) {
        window.dashboard.showNotification('Chargement des statistiques...', 'info');
    }
    
    window.googleSync.loadStats().then(stats => {
        if (window.dashboard && stats) {
            window.dashboard.showNotification('Statistiques chargées', 'success');
            console.log('📈 Stats Sheets:', stats);
        }
    });
}

// Auto-sync quand une tâche est créée ou terminée
document.addEventListener('taskCreated', (event) => {
    if (window.googleSync && window.googleSync.isEnabled && event.detail && event.detail.task) {
        window.googleSync.syncTask(event.detail.task);
    }
});

document.addEventListener('agentCreated', (event) => {
    if (window.googleSync && window.googleSync.isEnabled && event.detail && event.detail.agent) {
        window.googleSync.syncAgent(event.detail.agent);
    }
});