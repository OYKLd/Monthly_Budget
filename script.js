// Données de l'application
let budgetData = {
    income: 0,
    expenses: [],
    categories: {
        logement: 'Logement',
        transport: 'Transport',
        alimentation: 'Alimentation',
        sante: 'Sante',
        loisirs: 'Loisirs',
        education: 'Education',
        vetements: 'Vêtements',
        autres: 'Autres'
    }
};

let currentFilter = '';
let expenseToDelete = null;

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    loadDataFromStorage();
    updateDashboard();
    
    // Ajouter l'écouteur d'événement pour le formulaire
    document.getElementById('expense-form').addEventListener('submit', addExpense);
    
    // Ajouter l'écouteur pour le revenu
    document.getElementById('income-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            setIncome();
        }
    });
});

// Fonction pour définir le revenu mensuel
function setIncome() {
    const incomeInput = document.getElementById('income-input');
    const income = parseFloat(incomeInput.value);
    
    if (isNaN(income) || income <= 0) {
        showNotification('Veuillez entrer un revenu valide', 'error');
        return;
    }
    
    budgetData.income = income;
    incomeInput.value = '';
    saveDataToStorage();
    updateDashboard();
    showNotification('Revenu défini avec succès', 'success');
}

// Fonction pour ajouter une dépense
function addExpense(e) {
    e.preventDefault();
    
    const description = document.getElementById('expense-description').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    
    if (!description || isNaN(amount) || amount <= 0 || !category) {
        showNotification('Veuillez remplir tous les champs correctement', 'error');
        return;
    }
    
    const expense = {
        id: Date.now(),
        description: description,
        amount: amount,
        category: category,
        date: new Date().toISOString()
    };
    
    budgetData.expenses.push(expense);
    saveDataToStorage();
    updateDashboard();
    
    // Réinitialiser le formulaire
    document.getElementById('expense-form').reset();
    showNotification('Dépense ajoutée avec succès', 'success');
}

// Fonction pour supprimer une dépense
function deleteExpense(id) {
    expenseToDelete = id;
    const expense = budgetData.expenses.find(e => e.id === id);
    document.getElementById('confirm-message').textContent = 
        `Êtes-vous sûr de vouloir supprimer "${expense.description}" (${expense.amount} FCFA) ?`;
    document.getElementById('confirm-modal').classList.add('show');
}

// Fonction pour confirmer la suppression
function confirmDelete() {
    if (expenseToDelete) {
        budgetData.expenses = budgetData.expenses.filter(e => e.id !== expenseToDelete);
        saveDataToStorage();
        updateDashboard();
        closeModal();
        showNotification('Dépense supprimée avec succès', 'success');
    }
}

// Fonction pour fermer la modal
function closeModal() {
    document.getElementById('confirm-modal').classList.remove('show');
    expenseToDelete = null;
}

// Fonction pour vider toutes les dépenses
function clearAllExpenses() {
    if (budgetData.expenses.length === 0) {
        showNotification('Aucune dépense à supprimer', 'info');
        return;
    }
    
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les dépenses ?')) {
        budgetData.expenses = [];
        saveDataToStorage();
        updateDashboard();
        showNotification('Toutes les dépenses ont été supprimées', 'success');
    }
}

// Fonction pour filtrer les dépenses par catégorie
function filterExpenses() {
    const filterValue = document.getElementById('category-filter').value;
    currentFilter = filterValue;
    updateExpensesList();
}

// Fonction pour mettre à jour le dashboard
function updateDashboard() {
    updateSummaryCards();
    updateExpensesList();
    updateCategoryStats();
}

// Fonction pour mettre à jour les cartes de résumé
function updateSummaryCards() {
    const totalExpenses = budgetData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const balance = budgetData.income - totalExpenses;
    
    document.getElementById('monthly-income').textContent = formatCurrency(budgetData.income);
    document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('remaining-balance').textContent = formatCurrency(balance);
    
    // Mettre à jour la couleur du solde
    const balanceElement = document.getElementById('remaining-balance');
    balanceElement.style.color = balance >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
}

// Fonction pour mettre à jour la liste des dépenses
function updateExpensesList() {
    const expensesList = document.getElementById('expenses-list');
    
    let filteredExpenses = budgetData.expenses;
    if (currentFilter) {
        filteredExpenses = budgetData.expenses.filter(e => e.category === currentFilter);
    }
    
    // Trier par date (plus récent en premier)
    filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filteredExpenses.length === 0) {
        expensesList.innerHTML = '<p class="empty-state">Aucune dépense enregistrée</p>';
        return;
    }
    
    expensesList.innerHTML = filteredExpenses.map(expense => `
        <div class="expense-item">
            <div class="expense-info">
                <div class="expense-description">${expense.description}</div>
                <span class="expense-category">${budgetData.categories[expense.category]}</span>
            </div>
            <div class="expense-amount">${formatCurrency(expense.amount)}</div>
            <div class="expense-actions">
                <button onclick="deleteExpense(${expense.id})" class="btn btn-danger btn-small">
                    Supprimer
                </button>
            </div>
        </div>
    `).join('');
}

// Fonction pour mettre à jour les statistiques par catégorie
function updateCategoryStats() {
    const categoryStats = document.getElementById('category-stats');
    
    if (budgetData.expenses.length === 0) {
        categoryStats.innerHTML = '<p class="empty-state">Pas de données à afficher</p>';
        return;
    }
    
    // Calculer les totaux par catégorie
    const totals = {};
    let grandTotal = 0;
    
    Object.keys(budgetData.categories).forEach(category => {
        totals[category] = 0;
    });
    
    budgetData.expenses.forEach(expense => {
        totals[expense.category] += expense.amount;
        grandTotal += expense.amount;
    });
    
    // Générer le HTML des statistiques
    const statsHTML = Object.entries(totals)
        .filter(([category, total]) => total > 0)
        .map(([category, total]) => {
            const percentage = ((total / grandTotal) * 100).toFixed(1);
            return `
                <div class="category-stat-item ${category}">
                    <div class="stat-category">${budgetData.categories[category]}</div>
                    <div class="stat-amount">${formatCurrency(total)}</div>
                    <div class="stat-percentage">${percentage}%</div>
                </div>
            `;
        })
        .join('');
    
    categoryStats.innerHTML = statsHTML || '<p class="empty-state">Pas de données à afficher</p>';
}

// Fonction pour formater la monnaie
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0
    }).format(amount).replace('XOF', 'FCFA');
}

// Fonction pour afficher une notification
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 2000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    // Définir la couleur selon le type
    const colors = {
        success: '#16a34a',
        error: '#dc2626',
        info: '#2563eb',
        warning: '#f59e0b'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Ajouter au DOM
    document.body.appendChild(notification);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Fonctions pour le LocalStorage
function saveDataToStorage() {
    localStorage.setItem('budgetData', JSON.stringify(budgetData));
}

function loadDataFromStorage() {
    const stored = localStorage.getItem('budgetData');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            budgetData = { ...budgetData, ...parsed };
        } catch (e) {
            console.error('Erreur lors du chargement des données:', e);
        }
    }
}

// Ajouter les animations CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Configurer le bouton de confirmation dans la modal
document.getElementById('confirm-btn').addEventListener('click', confirmDelete);