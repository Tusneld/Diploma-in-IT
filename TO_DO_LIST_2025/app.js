// Function to update task status
function updateTaskStatus(taskId, newStatus) {
    // Find the task
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;
    
    // Update status
    tasks[taskIndex].status = newStatus;
    
    // Update completed property based on status
    if (newStatus === 'completed') {
        tasks[taskIndex].completed = true;
    } else {
        tasks[taskIndex].completed = false;
    }
    
    // Handle offline sync
    if (!navigator.onLine) {
        addToPendingSync(tasks[taskIndex]);
    }
    
    // Save and render
    saveTasks();
    renderTasks();
    updateTaskSummary();
}

// Setup drag and drop functionality
function setupDragAndDrop() {
    // Get all task lists
    const taskLists = [todoList, inProgressList, completedList];
    
    // Add event listeners to each task list
    taskLists.forEach(list => {
        // When a dragged item is over the list
        list.addEventListener('dragover', e => {
            e.preventDefault();
            list.classList.add('drag-over');
        });
        
        // When a dragged item leaves the list
        list.addEventListener('dragleave', () => {
            list.classList.remove('drag-over');
        });
        
        // When a dragged item is dropped on the list
        list.addEventListener('drop', e => {
            e.preventDefault();
            list.classList.remove('drag-over');
            
            // Get the task ID from the dragged item
            const taskId = e.dataTransfer.getData('text/plain');
            
            // Determine the new status based on the drop target
            let newStatus;
            if (list === todoList) {
                newStatus = 'todo';
            } else if (list === inProgressList) {
                newStatus = 'in-progress';
            } else if (list === completedList) {
                newStatus = 'completed';
            }
            
            // Update the task status
            updateTaskStatus(taskId, newStatus);
        });
    });
    
    // Add dragstart event to all tasks
    document.addEventListener('dragstart', e => {
        if (e.target.classList.contains('task')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.id);
            e.target.classList.add('dragging');
            
            // Add dragend event to remove dragging class
            e.target.addEventListener('dragend', () => {
                e.target.classList.remove('dragging');
            }, { once: true });
        }
    });
}

// Render tasks based on current filter and sort
function renderTasks() {
    // Clear all task lists
    todoList.innerHTML = '';
    inProgressList.innerHTML = '';
    completedList.innerHTML = '';
    
    // Filter tasks
    let filteredTasks = tasks;
    if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    } else if (currentFilter === 'pending') {
        filteredTasks = tasks.filter(task => !task.completed);
    } else if (currentFilter === 'scheduled') {
        filteredTasks = tasks.filter(task => task.scheduleDate && !task.completed);
    }
    
    // Sort tasks
    filteredTasks = sortTasks(filteredTasks, currentSort);
    
    // Count tasks by status
    let todoCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    
    // Render each task in its appropriate column
    filteredTasks.forEach(task => {
        // Create task element
        const taskItem = document.createElement('div');
        taskItem.classList.add('task');
        taskItem.classList.add(`${task.priority}-priority`);
        if (task.completed) {
            taskItem.classList.add('completed');
        }
        if (task.scheduleDate && !task.completed) {
            taskItem.classList.add('scheduled');
        }
        taskItem.dataset.id = task.id;
        taskItem.draggable = true;
        
        // Format dates
        const date = new Date(task.date);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        
        let scheduleInfo = '';
        if (task.scheduleDate) {
            const scheduleDate = new Date(task.scheduleDate);
            const formattedSchedule = `${scheduleDate.toLocaleDateString()} ${scheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            scheduleInfo = `<span class="task-badge"><i class="fas fa-clock"></i> ${formattedSchedule}</span>`;
        }
        
        // Get reminder information
        let reminderInfo = '';
        if (task.reminderSettings && task.reminderSettings.type !== 'none') {
            let reminderIcon = '';
            switch(task.reminderSettings.type) {
                case 'browser':
                    reminderIcon = '<i class="fas fa-bell"></i>';
                    break;
                case 'sms':
                    reminderIcon = '<i class="fas fa-sms"></i>';
                    break;
                case 'whatsapp':
                    reminderIcon = '<i class="fab fa-whatsapp"></i>';
                    break;
                case 'email':
                    reminderIcon = '<i class="fas fa-envelope"></i>';
                    break;
                default:
                    reminderIcon = '<i class="fas fa-bell"></i>';
            }
            
            const reminderTime = task.reminderSettings.time;
            const reminderUnit = task.reminderSettings.unit;
            reminderInfo = `<span class="task-badge">${reminderIcon} ${reminderTime} ${reminderUnit} before</span>`;
        }
        
        // Build task HTML
        taskItem.innerHTML = `
            <div class="task-content">
                <div class="task-text">${task.text}</div>
                <div class="task-meta">
                    <span class="task-badge"><i class="fas fa-calendar-alt"></i> ${formattedDate}</span>
                    <span class="task-badge"><i class="fas fa-flag"></i> ${task.priority}</span>
                    ${scheduleInfo}
                    ${reminderInfo}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-btn complete-btn" title="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}"><i class="fas ${task.completed ? 'fa-times-circle' : 'fa-check-circle'}"></i></button>
                <button class="task-btn edit-btn" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="task-btn delete-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        
        // Add status change buttons based on current status
        const actionsDiv = taskItem.querySelector('.task-actions');
        
        if (task.status !== 'todo') {
            const todoBtn = document.createElement('button');
            todoBtn.className = 'task-btn move-to-todo';
            todoBtn.title = 'Move to To Do';
            todoBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
            actionsDiv.appendChild(todoBtn);
        }
        
        if (task.status !== 'in-progress') {
            const progressBtn = document.createElement('button');
            progressBtn.className = 'task-btn move-to-progress';
            progressBtn.title = 'Move to In Progress';
            progressBtn.innerHTML = '<i class="fas fa-spinner"></i>';
            actionsDiv.appendChild(progressBtn);
        }
        
        if (task.status !== 'completed') {
            const completeBtn = document.createElement('button');
            completeBtn.className = 'task-btn move-to-completed';
            completeBtn.title = 'Move to Completed';
            completeBtn.innerHTML = '<i class="fas fa-check"></i>';
            actionsDiv.appendChild(completeBtn);
        }
        
        // Add task to appropriate column based on status
        if (task.status === 'todo' || !task.status) {
            todoList.appendChild(taskItem);
            todoCount++;
        } else if (task.status === 'in-progress') {
            inProgressList.appendChild(taskItem);
            inProgressCount++;
        } else if (task.status === 'completed') {
            completedList.appendChild(taskItem);
            completedCount++;
        }
    });
    
    // Update column counts
    document.getElementById('todo-count').textContent = todoCount;
    document.getElementById('in-progress-count').textContent = inProgressCount;
    document.getElementById('completed-count').textContent = completedCount;
    
    // Update task counter
    taskCounter.textContent = `(${tasks.length})`;
}

// Initialize the application
function init() {
    // Load tasks from local storage
    loadTasks();
    
    // Render tasks
    renderTasks();
    
    // Update task summary
    updateTaskSummary();
    
    // Setup drag and drop
    setupDragAndDrop();
    
    // Check for scheduled tasks
    checkScheduledTasks();
    
    // Check online status
    updateOnlineStatus();
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Function to load tasks from local storage
function loadTasks() {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
        
        // Ensure all tasks have a status property
        tasks.forEach(task => {
            if (!task.status) {
                task.status = task.completed ? 'completed' : 'todo';
            }
        });
    }
    
    // Check URL for shared tasks
    const urlParams = new URLSearchParams(window.location.search);
    const sharedTasksParam = urlParams.get('tasks');
    if (sharedTasksParam) {
        try {
            const sharedTasks = JSON.parse(decodeURIComponent(sharedTasksParam));
            if (Array.isArray(sharedTasks) && sharedTasks.length > 0) {
                // Merge shared tasks with existing tasks, avoiding duplicates
                sharedTasks.forEach(sharedTask => {
                    const exists = tasks.some(task => task.id === sharedTask.id);
                    if (!exists) {
                        tasks.push(sharedTask);
                        
                        // Schedule notifications for shared tasks
                        if (sharedTask.scheduleDate && !sharedTask.completed) {
                            scheduleNotification(sharedTask);
                        }
                    }
                });
                saveTasks();
                showNotification('Shared tasks imported successfully!', 'success');
            }
        } catch (error) {
            console.error('Error parsing shared tasks:', error);
            showNotification('Error importing shared tasks', 'error');
        }
    }
}