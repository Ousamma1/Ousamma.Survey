// Configuration
const API_BASE_URL = 'http://localhost:3006/api/projects';
const USER_ID = 'user-123'; // In production, this would come from authentication

// State
let projects = [];
let currentProject = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadProjects();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('projectForm').addEventListener('submit', handleProjectSubmit);
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`, {
            headers: {
                'x-user-id': USER_ID
            }
        });

        if (!response.ok) throw new Error('Failed to load stats');

        const result = await response.json();
        const stats = result.data;

        document.getElementById('totalProjects').textContent = stats.totalProjects;
        document.getElementById('activeProjects').textContent = stats.activeProjects;
        document.getElementById('ownedProjects').textContent = stats.ownedProjects;
        document.getElementById('memberProjects').textContent = stats.memberProjects;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load projects
async function loadProjects() {
    const container = document.getElementById('projectsContainer');
    const status = document.getElementById('statusFilter').value;

    try {
        container.innerHTML = '<div class="loading">Loading projects...</div>';

        const response = await fetch(`${API_BASE_URL}?status=${status}`, {
            headers: {
                'x-user-id': USER_ID
            }
        });

        if (!response.ok) throw new Error('Failed to load projects');

        const result = await response.json();
        projects = result.data;

        displayProjects(projects);
    } catch (error) {
        console.error('Error loading projects:', error);
        container.innerHTML = '<div class="empty-state"><h3>Error loading projects</h3><p>Please try again later</p></div>';
    }
}

// Display projects
function displayProjects(projectList) {
    const container = document.getElementById('projectsContainer');

    if (projectList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No projects found</h3>
                <p>Create your first project to get started</p>
            </div>
        `;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'projects-grid';

    projectList.forEach(project => {
        const card = createProjectCard(project);
        grid.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

// Create project card
function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';

    const role = project.ownerId === USER_ID ? 'owner' :
                 project.members.find(m => m.userId === USER_ID)?.role || 'viewer';

    card.innerHTML = `
        <div class="project-card-header">
            <div>
                <h3>${project.name}</h3>
                <span class="status-badge status-${project.status}">${project.status}</span>
            </div>
            <span class="project-role role-${role}">${role}</span>
        </div>
        <p>${project.description || 'No description provided'}</p>
        <div class="project-stats">
            <div class="project-stat">
                <span>📋</span>
                <span>${project.metadata.totalSurveys || 0} Surveys</span>
            </div>
            <div class="project-stat">
                <span>📁</span>
                <span>${project.metadata.totalGroups || 0} Groups</span>
            </div>
            <div class="project-stat">
                <span>👥</span>
                <span>${project.metadata.totalMembers || 0} Members</span>
            </div>
        </div>
        <div class="project-actions">
            <button class="btn btn-primary" onclick="viewProject('${project._id}')">Open</button>
            ${role === 'owner' || role === 'admin' ?
                `<button class="btn btn-secondary" onclick="editProject('${project._id}')">Edit</button>` : ''}
            <button class="btn btn-secondary" onclick="viewMembers('${project._id}')">Members</button>
            <button class="btn btn-secondary" onclick="viewGroups('${project._id}')">Groups</button>
        </div>
    `;

    return card;
}

// Search projects
function searchProjects() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    const filtered = projects.filter(project =>
        project.name.toLowerCase().includes(searchTerm) ||
        (project.description && project.description.toLowerCase().includes(searchTerm))
    );

    displayProjects(filtered);
}

// Filter projects by status
function filterProjects() {
    loadProjects();
}

// Open create modal
function openCreateModal() {
    currentProject = null;
    document.getElementById('modalTitle').textContent = 'Create New Project';
    document.getElementById('projectForm').reset();
    document.getElementById('projectModal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('projectModal').classList.remove('active');
    currentProject = null;
}

// Handle project form submit
async function handleProjectSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('projectName').value;
    const description = document.getElementById('projectDescription').value;

    const projectData = {
        name,
        description
    };

    try {
        const url = currentProject
            ? `${API_BASE_URL}/${currentProject._id}`
            : API_BASE_URL;

        const method = currentProject ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': USER_ID
            },
            body: JSON.stringify(projectData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save project');
        }

        const result = await response.json();
        alert(result.message);

        closeModal();
        loadStats();
        loadProjects();
    } catch (error) {
        console.error('Error saving project:', error);
        alert('Error: ' + error.message);
    }
}

// Edit project
function editProject(projectId) {
    const project = projects.find(p => p._id === projectId);
    if (!project) return;

    currentProject = project;
    document.getElementById('modalTitle').textContent = 'Edit Project';
    document.getElementById('projectName').value = project.name;
    document.getElementById('projectDescription').value = project.description || '';
    document.getElementById('projectModal').classList.add('active');
}

// View project
function viewProject(projectId) {
    window.location.href = `project-details.html?id=${projectId}`;
}

// View members
function viewMembers(projectId) {
    window.location.href = `project-members.html?id=${projectId}`;
}

// View groups
function viewGroups(projectId) {
    window.location.href = `project-groups.html?id=${projectId}`;
}

// Delete project
async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${projectId}`, {
            method: 'DELETE',
            headers: {
                'x-user-id': USER_ID
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete project');
        }

        const result = await response.json();
        alert(result.message);

        loadStats();
        loadProjects();
    } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error: ' + error.message);
    }
}

// Archive project
async function archiveProject(projectId) {
    if (!confirm('Are you sure you want to archive this project?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${projectId}/archive`, {
            method: 'POST',
            headers: {
                'x-user-id': USER_ID
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to archive project');
        }

        const result = await response.json();
        alert(result.message);

        loadStats();
        loadProjects();
    } catch (error) {
        console.error('Error archiving project:', error);
        alert('Error: ' + error.message);
    }
}
