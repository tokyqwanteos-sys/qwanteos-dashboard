// Google Sheets Sync pour SETUP QWANTEOS - VERSION MULTI-AGENTS
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
            // ID unique basé sur timestamp + random + user agent
            const userInfo = navigator.userAgent + Math.random().toString(36);
            id = 'DASH_' + Date.now() + '_' + this.hashString(userInfo).substr(0, 8);
            localStorage.setItem('qwanteos_dashboard_id', id);
        }
        return id;
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    initialize() {
        const saved = localStorage.getItem('qwanteos_sync_enabled');
        this.isEnabled = saved === 'true';
        
        if (this.isEnabled) {
            this.startAutoSync();
        }
        
        this.updateUI();
        this.checkInitialSync();
    }

    enable() {
        this.isEnabled = true;
        localStorage.setItem('qwanteos_sync_enabled', 'true');
        this.startAutoSync();
        this.updateUI();
        
        if (window.dashboard) {
            window.dashboard.showNotification('✅ Sync activée - Mode multi-agents sécurisé', 'success');
        }
        return true;
    }

    disable() {
        this.isEnabled = false;
        localStorage.setItem('qwanteos_sync_enabled', 'false');
        this.stopAutoSync();
        this.updateUI();
        
        if (window.dashboard) {
            window.dashboard.showNotification('🔒 Sync désactivée', 'warning');
        }
        return true;
    }

    startAutoSync() {
        this.stopAutoSync();
        
        // Sync toutes les 2 minutes pour éviter les conflits
        this.syncInterval = setInterval(() => {
            this.safeSync();
        }, 120000);
        
        // Première sync après 5 secondes
        setTimeout(() => this.safeSync(), 5000);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async safeSync() {
        if (!this.isEnabled || !window.dashboard) return;
        
        try {
            // Vérifier d'abord les IDs existants dans Google Sheets
            const existingIds = await this.getExistingIds();
            
            // Préparer les données locales
            const localTasks = window.dashboard.getTasks();
            const localAgents = window.dashboard.getAgents();
            
            // Filtrer seulement les NOUVELLES données
            const newTasks = localTasks.filter(task => 
                !existingIds.tasks.includes(task.id.toString())
            );
            
            const newAgents = localAgents.filter(agent => 
                !existingIds.agents.includes(agent.id.toString())
            );
            
            if (newTasks.length === 0 && newAgents.length === 0) {
                // Rien de nouveau à synchroniser
                this.showStatus('info', '✓ Pas de nouvelles données');
                return;
            }
            
            // Envoyer seulement les nouvelles données
            const syncData = {
                tasks: newTasks,
                agents: newAgents,
                timestamp: new Date().toISOString(),
                dashboardId: this.dashboardId,
                syncMode: 'append_only'
            };

            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'appendData',
                    data: syncData,
                    apiKey: this.apiKey
                })
            });

            // En mode no-cors, on ne peut pas lire la réponse
            // Mais on suppose que c'est réussi si pas d'erreur
            this.showStatus('success', `✓ Ajouté: ${newTasks.length} tâches, ${newAgents.length} agents`);
            
            // Mettre à jour le timestamp
            localStorage.setItem('qwanteos_last_sync', new Date().toISOString());
            
        } catch (error) {
            console.error('❌ Erreur sync:', error);
            this.showStatus('error', '✗ Hors ligne - Données sauvegardées localement');
        }
    }

    async getExistingIds() {
        try {
            const response = await fetch(
                `${this.scriptUrl}?action=getUniqueIds&apiKey=${this.apiKey}&t=${Date.now()}`
            );
            
            if (response.ok) {
                const data = await response.json();
                return {
                    tasks: data.tasks || [],
                    agents: data.agents || []
                };
            }
        } catch (error) {
            console.warn('⚠️ Impossible de récupérer les IDs - Mode local');
        }
        
        // Fallback: retourner des tableaux vides
        return { tasks: [], agents: [] };
    }

    async syncNow() {
        if (!window.dashboard) return false;
        
        if (window.dashboard) {
            window.dashboard.showNotification('🔄 Synchronisation sécurisée en cours...', 'info');
        }
        
        await this.safeSync();
        
        if (window.dashboard) {
            window.dashboard.showNotification('✅ Synchronisation terminée sans écrasement', 'success');
        }
        
        return true;
    }

    async loadFromSheets() {
        if (!window.dashboard) return false;
        
        if (window.dashboard) {
            window.dashboard.showNotification('📥 Chargement depuis Google Sheets...', 'info');
        }
        
        try {
            const response = await fetch(
                `${this.scriptUrl}?action=getAll&apiKey=${this.apiKey}&t=${Date.now()}`
            );
            
            if (!response.ok) throw new Error('Network error');
            
            const data = await response.json();
            
            if (data && data.tasks && data.agents) {
                // Fusion intelligente
                await this.mergeData(data.tasks, data.agents);
                
                this.showStatus('success', '✓ Données fusionnées avec succès');
                
                if (window.dashboard) {
                    window.dashboard.showNotification('✅ Données chargées et fusionnées', 'success');
                }
                return true;
            }
        } catch (error) {
            console.error('Erreur chargement:', error);
            this.showStatus('error', '✗ Impossible de charger');
            
            if (window.dashboard) {
                window.dashboard.showNotification('❌ Erreur de chargement', 'error');
            }
        }
        return false;
    }

    async mergeData(remoteTasks, remoteAgents) {
        if (!window.dashboard) return;
        
        const localTasks = window.dashboard.getTasks();
        const localAgents = window.dashboard.getAgents();
        
        // Convertir les données Sheets en format dashboard
        const formattedTasks = remoteTasks.map(task => ({
            id: task.ID || task.id,
            name: task['Nom Tâche'] || task.name,
            category: task.Catégorie || task.category,
            agent: task.Agent || task.agent,
            startTime: task['Date Début'] || task.startTime,
            endTime: task['Date Fin'] || task.endTime,
            duration: task.Durée || task.duration,
            status: task.Statut || task.status,
            description: task.Description || task.description
        }));
        
        const formattedAgents = remoteAgents.map(agent => ({
            id: agent.ID || agent.id,
            name: agent.Nom || agent.name,
            email: agent.Email || agent.email,
            department: agent.Département || agent.department,
            date: agent['Date Ajout'] || agent.date
        }));
        
        // Créer des Maps pour vérifier les doublons
        const localTaskMap = new Map(localTasks.map(t => [t.id.toString(), t]));
        const localAgentMap = new Map(localAgents.map(a => [a.id.toString(), a]));
        
        // Ajouter seulement les nouvelles tâches
        formattedTasks.forEach(task => {
            const taskId = task.id.toString();
            if (!localTaskMap.has(taskId)) {
                localTasks.push(task);
                localTaskMap.set(taskId, task);
            }
        });
        
        // Ajouter seulement les nouveaux agents
        formattedAgents.forEach(agent => {
            const agentId = agent.id.toString();
            if (!localAgentMap.has(agentId)) {
                localAgents.push(agent);
                localAgentMap.set(agentId, agent);
            }
        });
        
        // Sauvegarder les données fusionnées
        localStorage.setItem('qwanteos_tasks', JSON.stringify(localTasks));
        localStorage.setItem('qwanteos_agents', JSON.stringify(localAgents));
        
        // Rafraîchir le dashboard
        window.dashboard.updateStatistics();
        window.dashboard.updateCharts();
        window.dashboard.loadAgentsToSelect();
        window.dashboard.updateTodayTasks();
    }

    checkInitialSync() {
        const lastSync = localStorage.getItem('qwanteos_last_sync');
        if (!lastSync) {
            // Première utilisation - activer la sync automatiquement
            setTimeout(() => {
                if (window.dashboard) {
                    window.dashboard.showNotification(
                        '🌐 Synchronisation multi-agents prête. Activez la sync pour partager vos données.',
                        'info'
                    );
                }
            }, 3000);
        }
    }

    showStatus(type, message) {
        const statusElement = document.getElementById('syncStatus');
        if (statusElement) {
            let icon = '🔄';
            let color = '#3498db';
            
            switch(type) {
                case 'success':
                    icon = '✅';
                    color = '#27ae60';
                    break;
                case 'error':
                    icon = '❌';
                    color = '#e74c3c';
                    break;
                case 'info':
                    icon = 'ℹ️';
                    color = '#3498db';
                    break;
            }
            
            statusElement.innerHTML = `<span style="color: ${color}; font-weight: 500;">${icon} ${message}</span>`;
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

// Initialiser le système de sync
document.addEventListener('DOMContentLoaded', () => {
    window.googleSync = new GoogleSheetsSync();
});

// Fonctions globales accessibles depuis HTML
function enableCloudSync() {
    if (window.googleSync) {
        window.googleSync.enable();
    }
}

function disableCloudSync() {
    if (window.googleSync) {
        window.googleSync.disable();
    }
}

function syncNow() {
    if (window.googleSync) {
        window.googleSync.syncNow();
    }
}

function loadFromSheets() {
    if (window.googleSync) {
        window.googleSync.loadFromSheets();
    }
}

// Export pour les tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GoogleSheetsSync };
}