// ==================================================
// 1. FIREBASE CONFIGURATION & IMPORTS
// ==================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔴 YOUR FIREBASE CONFIG HERE 🔴
const firebaseConfig = {
  apiKey: "AIzaSyAxxXsRIWM1uO3TWrUfp5J6S1jWe7p_SbE",
  authDomain: "eds-project-7c88f.firebaseapp.com",
  projectId: "eds-project-7c88f",
  storageBucket: "eds-project-7c88f.firebasestorage.app",
  messagingSenderId: "558974093818",
  appId: "1:558974093818:web:573b2bc5eab7e0a673bc43",
  measurementId: "G-5PCQ6GQVNG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const teamsCollection = collection(db, "teams");
const usersCollection = collection(db, "users");
const challengesCollection = collection(db, "challenges");

// ==================================================
// 2. GLOBAL VARIABLES
// ==================================================
let isLoggedIn = false;
let currentUser = null;

// ==================================================
// 3. INITIALIZATION
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
    startCountdown();
    renderChallenges(); // Load challenges on startup

    // Expose Functions
    window.switchTab = switchTab;
    window.handleLogin = handleLogin;
    window.handleSignup = handleSignup;
    window.registerNewTeam = registerNewTeam;
    window.logout = logout;
    window.approveTeam = approveTeam;
    window.deleteTeam = deleteTeam;
    window.viewTeam = viewTeam;
    window.closeModal = closeModal;
    window.openChallengeDetails = openChallengeDetails;
    
    // Admin Challenge Functions
    window.openAddChallengeModal = openAddChallengeModal;
    window.closeAddChallengeModal = closeAddChallengeModal;
    window.saveChallenge = saveChallenge;
    window.openEditChallengeModal = openEditChallengeModal;
    window.closeEditChallengeModal = closeEditChallengeModal;
    window.updateChallenge = updateChallenge;
    window.deleteChallenge = deleteChallenge;

    // Profile Functions
    window.previewProfileImage = previewProfileImage;
    window.updateUserProfile = updateUserProfile;

    // Mobile Menu Toggle
    window.toggleMenu = toggleMenu;
});

// ==================================================
// 4. MOBILE MENU & NAVIGATION
// ==================================================
function toggleMenu() {
    const nav = document.getElementById('navLinks');
    nav.classList.toggle('active');
    
    // Optional: Switch icon from bars to times
    const icon = document.querySelector('.menu-toggle i');
    if(nav.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

function switchTab(tabId) {
    // Close mobile menu if open
    const nav = document.getElementById('navLinks');
    if (nav && nav.classList.contains('active')) {
        toggleMenu(); 
    }

    if (tabId === 'register' && !isLoggedIn) tabId = 'login';
    
    if (tabId === 'admin') {
        if (!isLoggedIn || !currentUser || currentUser.role !== 'ADMIN') {
            alert("Access Denied: Admins Only.");
            tabId = 'home';
        } else {
            renderAdminData();
        }
    }

    // New: If switching to profile, check login
    if (tabId === 'profile') {
        if (!isLoggedIn) {
            tabId = 'login';
        } else {
            loadProfileData(); 
        }
    }

    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.add('hidden');
        sec.classList.remove('active');
    });
    
    const activeSection = document.getElementById(tabId);
    if (activeSection) {
        activeSection.classList.remove('hidden');
        setTimeout(() => activeSection.classList.add('active'), 10);
    }

    if (tabId === 'register' && isLoggedIn && currentUser.role !== 'ADMIN') {
        populateTeamData(); 
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================================================
// 5. AUTHENTICATION SYSTEM
// ==================================================
async function handleSignup(event) {
    event.preventDefault();
    const name = event.target.querySelector('input[placeholder="John Doe"]').value;
    const email = event.target.querySelector('input[type="email"]').value;
    const pass = document.getElementById('spass').value;
    const confirmPass = document.getElementById('spassConfirm').value;
    const btn = event.target.querySelector('button');

    if (pass !== confirmPass) { alert("Passwords do not match!"); return; }

    btn.innerText = "Checking...";
    btn.disabled = true;

    try {
        const q = query(usersCollection, where("email", "==", email));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) { 
            alert("Email already exists! Please login."); 
            btn.innerText = "Create Account"; 
            btn.disabled = false; 
            return; 
        }

        const newUser = {
            name: name,
            email: email,
            password: pass, 
            role: "USER",
            teamName: "",
            createdAt: new Date()
        };

        await addDoc(usersCollection, newUser);
        
        saveUserSession(newUser);
        alert("Account Created Successfully!");
        switchTab('register');

    } catch (error) {
        console.error("Signup Error:", error);
        alert("Error creating account.");
    }
    btn.disabled = false;
}

async function handleLogin(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    const pass = event.target.querySelector('input[type="password"]').value;
    const btn = event.target.querySelector('button');

    btn.innerText = "Verifying...";
    btn.disabled = true;

    try {
        if (email === "admin@eds.com" && pass === "admin123") {
            saveUserSession({ name: "Admin", email: email, role: "ADMIN" });
            switchTab('admin');
            return;
        }

        const q = query(usersCollection, where("email", "==", email), where("password", "==", pass));
        const snapshot = await getDocs(q);

        if (snapshot.empty) { 
            alert("Invalid Email or Password!"); 
            btn.innerText = "Login"; 
            btn.disabled = false; 
            return; 
        }

        const userDoc = snapshot.docs[0].data();
        const teamData = await fetchMyTeam(email);
        
        const sessionUser = { 
            ...userDoc, 
            teamName: teamData ? teamData.name : "",
            track: teamData ? teamData.track : ""
        };

        saveUserSession(sessionUser);
        switchTab('register');

    } catch (error) {
        console.error("Login Error:", error);
        alert("Connection Error!");
    }
    btn.innerText = "Login"; 
    btn.disabled = false;
}

function saveUserSession(user) {
    currentUser = user;
    isLoggedIn = true;
    localStorage.setItem('eds_user', JSON.stringify(user));
    updateUI();
}

function checkUserSession() {
    const saved = localStorage.getItem('eds_user');
    if (saved) { 
        currentUser = JSON.parse(saved); 
        isLoggedIn = true; 
        updateUI(); 
    }
}

function logout() {
    if(confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('eds_user');
        location.reload(); 
    }
}

function updateUI() {
    const regBtn = document.getElementById('regBtn');
    const profileBtn = document.getElementById('profileBtn'); 
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (currentUser.role === 'ADMIN') {
        regBtn.innerText = "Dashboard";
        regBtn.setAttribute('onclick', "switchTab('admin')");
    } else {
        regBtn.innerText = "My Team";
        regBtn.setAttribute('onclick', "switchTab('register')");
    }
    
    // إظهار زر البروفايل والخروج
    if (profileBtn) profileBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
}

// ==================================================
// 6. TEAM REGISTRATION
// ==================================================
async function registerNewTeam() {
    const teamName = document.getElementById('regTeamName').value;
    const leaderName = document.getElementById('regLeaderName').value;
    const track = document.getElementById('regTeamTrack').value;
    const btn = document.querySelector('#register button');

    if(!teamName || !leaderName) { alert("Please fill Team Name & Leader!"); return; }

    let squad = [];
    document.querySelectorAll('.member-card:not(.leader-box) input').forEach(i => {
        if(i.value.trim()) squad.push(i.value.trim());
    });

    if(squad.length < 1) { alert("Minimum 2 members required!"); return; }

    btn.innerText = "Processing..."; 
    btn.disabled = true;

    try {
        const newTeamData = {
            name: teamName, 
            leader: leaderName, 
            email: currentUser.email, 
            track: track,
            status: "pending", 
            members: squad, 
            createdAt: new Date()
        };

        await addDoc(teamsCollection, newTeamData);

        currentUser.teamName = teamName;
        saveUserSession(currentUser);
        populateTeamData(newTeamData);
        alert("Success! Team Registered.");

    } catch(e) { 
        console.error(e); 
        alert("Error saving data"); 
        btn.innerText = "Confirm Registration"; 
        btn.disabled = false; 
    }
}

async function populateTeamData(manualData = null) {
    const myTeam = manualData || await fetchMyTeam(currentUser.email);
    const form = document.getElementById('creationForm');
    const panel = document.getElementById('teamStatusPanel');
    
    if(!form || !panel) return;

    if (myTeam) {
        form.classList.add('hidden');
        panel.classList.remove('hidden');
        
        document.getElementById('displayTeamName').innerText = myTeam.name;
        
        const badge = document.getElementById('displayStatusBadge');
        const icon = document.getElementById('statusIcon');
        const text = document.getElementById('displayStatusText');

        badge.innerText = myTeam.status.toUpperCase();
        badge.className = `status-badge large ${myTeam.status}`;
        
        if (myTeam.status === 'pending') {
            icon.innerHTML = '<i class="fas fa-hourglass-half" style="color: #FFD700;"></i>';
            text.innerText = "Your application is under review.";
        } else {
            icon.innerHTML = '<i class="fas fa-check-circle" style="color: #00ff7f;"></i>';
            text.innerText = "Congratulations! Team Approved.";
        }

    } else {
        form.classList.remove('hidden');
        panel.classList.add('hidden');
        
        const emailInput = document.getElementById('regTeamEmail');
        if(emailInput) {
            emailInput.value = currentUser.email;
            emailInput.setAttribute('readonly', true);
            emailInput.style.opacity = "0.7";
        }
    }
}

// ==================================================
// 7. ADMIN DASHBOARD
// ==================================================
async function renderAdminData() {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center'>Loading Data...</td></tr>";
    
    const teams = await fetchAllTeams();
    tbody.innerHTML = "";

    updateAdminStats(teams);

    if (teams.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center'>No teams registered yet.</td></tr>";
        return;
    }

    teams.forEach(team => {
        const approveBtn = team.status === 'pending' 
            ? `<button class="action-btn" onclick="approveTeam('${team.firebaseId}')" title="Approve"><i class="fas fa-check" style="color:#00ff7f;"></i></button>` 
            : '';

        const row = `
            <tr>
                <td>#..${team.firebaseId.slice(-4)}</td>
                <td>${team.name}</td>
                <td>${team.leader}</td>
                <td>${team.track}</td>
                <td><span class="status-badge ${team.status}">${team.status.toUpperCase()}</span></td>
                <td>
                    <button class="action-btn" onclick="viewTeam('${team.firebaseId}')"><i class="fas fa-eye"></i></button>
                    ${approveBtn}
                    <button class="action-btn" onclick="deleteTeam('${team.firebaseId}')" style="color:#ff4d4d; border-color:#ff4d4d"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function updateAdminStats(teams) {
    const cards = document.querySelectorAll('#admin .cards-grid h3');
    if(cards.length >= 3) {
        cards[0].innerText = teams.length;
        const totalParticipants = teams.reduce((total, team) => {
            const membersCount = team.members ? team.members.length : 0;
            return total + 1 + membersCount;
        }, 0);
        cards[1].innerText = totalParticipants;
        cards[2].innerText = teams.filter(t => t.status === 'pending').length;
    }
}

async function approveTeam(docId) {
    const teamRef = doc(db, "teams", docId);
    await updateDoc(teamRef, { status: "approved" });
    renderAdminData(); 
}

async function deleteTeam(docId) {
    if(confirm("Delete this team permanently?")) {
        await deleteDoc(doc(db, "teams", docId));
        renderAdminData();
    }
}

// ==================================================
// 8. CHALLENGES & MODALS
// ==================================================

// Add Challenge Functions (Admin)
function openAddChallengeModal() {
    document.getElementById('addChallengeModal').classList.add('active');
}
function closeAddChallengeModal() {
    document.getElementById('addChallengeModal').classList.remove('active');
}

async function saveChallenge(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    btn.innerText = "Publishing..."; btn.disabled = true;

    try {
        const title = document.getElementById('chTitle').value;
        const diff = document.getElementById('chDiff').value;
        const points = document.getElementById('chPoints').value;
        const desc = document.getElementById('chDesc').value;
        const tag = document.getElementById('chTag').value;
        
        const reqsString = document.getElementById('chReqs').value;
        const reqs = reqsString.split(',').map(s => s.trim());

        await addDoc(challengesCollection, {
            title, difficulty: diff, points, desc, tag, reqs, createdAt: new Date()
        });

        alert("Challenge Published!");
        closeAddChallengeModal();
        event.target.reset();
        renderChallenges(); 

    } catch (e) {
        console.error(e);
        alert("Error publishing challenge");
    }
    btn.innerText = "Publish Challenge"; btn.disabled = false;
}

// Render Challenges (User & Admin with Edit/Delete)
async function renderChallenges() {
    const grid = document.getElementById('challengesGrid');
    if(!grid) return;
    
    if(!grid.innerHTML.includes("Loading")) {
         grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Loading Challenges...</p>';
    }

    const q = query(challengesCollection);
    const snapshot = await getDocs(q);
    
    grid.innerHTML = ""; 

    if (snapshot.empty) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No challenges available yet.</p>';
        return;
    }

    snapshot.forEach(doc => {
        const c = doc.data();
        const diffColorClass = c.difficulty.toLowerCase(); 
        
        // 🔴 ADMIN CONTROLS 🔴
        let adminControls = "";
        if (currentUser && currentUser.role === 'ADMIN') {
            adminControls = `
                <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="openEditChallengeModal('${doc.id}')" class="action-btn" title="Edit" style="color: #FFD700; border-color: #FFD770;"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteChallenge('${doc.id}')" class="action-btn" title="Delete" style="color: #ff4d4d; border-color: #ff4d4d;"><i class="fas fa-trash"></i></button>
                </div>
            `;
        }
        
        const card = `
            <div class="card glass">
                <div class="card-header">
                    <span class="tag ${diffColorClass}">${c.difficulty.toUpperCase()}</span>
                    <span class="points" style="color:var(--gold-color)">${c.points} XP</span>
                </div>
                <h3>${c.title}</h3>
                <p>${c.desc}</p>
                <div class="card-footer">
                    <span class="lang-tag">${c.tag}</span>
                    <button class="btn-icon" onclick="openChallengeDetails('${doc.id}')">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                ${adminControls}
            </div>
        `;
        grid.innerHTML += card;
    });
}

// Open Challenge Details (User)
async function openChallengeDetails(docId) {
    document.getElementById('detailTitle').innerText = "Loading...";
    switchTab('challenge-details');

    try {
        const docRef = doc(db, "challenges", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const c = docSnap.data();
            
            document.getElementById('detailTitle').innerText = c.title;
            document.getElementById('detailDesc').innerText = c.desc;
            document.getElementById('detailPoints').innerText = `${c.points} XP`;
            
            const badge = document.getElementById('detailBadge');
            badge.innerText = c.difficulty.toUpperCase();
            badge.className = `tag ${c.difficulty.toLowerCase()}`;

            const reqList = document.getElementById('detailReqs');
            reqList.innerHTML = "";
            c.reqs.forEach(req => {
                reqList.innerHTML += `<li style="margin-bottom: 10px; padding-left: 20px; position: relative;">
                    <i class="fas fa-check" style="color:var(--primary-color); position:absolute; left:0; top:4px;"></i> ${req}
                </li>`;
            });
        }
    } catch (e) {
        console.error(e);
        document.getElementById('detailTitle').innerText = "Error Loading Challenge";
    }
}

// ================= EDIT & DELETE CHALLENGES =================

// Delete Challenge
async function deleteChallenge(docId) {
    if(confirm("Are you sure you want to delete this challenge permanently?")) {
        try {
            await deleteDoc(doc(db, "challenges", docId));
            alert("Challenge deleted!");
            renderChallenges(); 
        } catch(e) {
            console.error(e);
            alert("Error deleting challenge.");
        }
    }
}

// Open Edit Modal
async function openEditChallengeModal(docId) {
    const modal = document.getElementById('editChallengeModal');
    
    const docRef = doc(db, "challenges", docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        
        document.getElementById('editChId').value = docId;
        document.getElementById('editChTitle').value = data.title;
        document.getElementById('editChDiff').value = data.difficulty;
        document.getElementById('editChPoints').value = data.points;
        document.getElementById('editChDesc').value = data.desc;
        document.getElementById('editChTag').value = data.tag;
        document.getElementById('editChReqs').value = data.reqs.join(', ');

        modal.classList.add('active');
    }
}

// Update Challenge
async function updateChallenge(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    btn.innerText = "Saving..."; btn.disabled = true;

    try {
        const id = document.getElementById('editChId').value;
        const title = document.getElementById('editChTitle').value;
        const diff = document.getElementById('editChDiff').value;
        const points = document.getElementById('editChPoints').value;
        const desc = document.getElementById('editChDesc').value;
        const tag = document.getElementById('editChTag').value;
        
        const reqsString = document.getElementById('editChReqs').value;
        const reqs = reqsString.split(',').map(s => s.trim());

        const docRef = doc(db, "challenges", id);
        
        await updateDoc(docRef, {
            title, difficulty: diff, points, desc, tag, reqs
        });

        alert("Challenge Updated Successfully!");
        closeEditChallengeModal();
        renderChallenges();

    } catch (e) {
        console.error(e);
        alert("Error updating challenge");
    }
    btn.innerText = "Save Changes"; btn.disabled = false;
}

function closeEditChallengeModal() {
    document.getElementById('editChallengeModal').classList.remove('active');
}


// View Team Modal (Admin)
async function viewTeam(docId) {
    const teams = await fetchAllTeams();
    const team = teams.find(t => t.firebaseId === docId);
    
    if (team) {
        document.getElementById('modalTeamName').innerText = team.name;
        document.getElementById('modalLeader').innerText = team.leader;
        document.getElementById('modalTrack').innerText = team.track;
        document.getElementById('modalEmail').innerText = team.email;
        
        const badge = document.getElementById('modalStatus');
        badge.innerText = team.status.toUpperCase();
        badge.className = `status-badge ${team.status}`;
        
        const list = document.getElementById('modalMembers');
        list.innerHTML = "";
        
        if (team.members && team.members.length > 0) {
            team.members.forEach(m => list.innerHTML += `<li><i class="fas fa-user"></i> ${m}</li>`);
        } else {
            list.innerHTML = "<li>No additional members</li>";
        }

        document.getElementById('teamModal').classList.add('active');
    }
}

function closeModal() {
    document.getElementById('teamModal').classList.remove('active');
}

// ==================================================
// 9. HELPERS & NAVIGATION
// ==================================================
async function fetchAllTeams() {
    const querySnapshot = await getDocs(teamsCollection);
    let teams = [];
    querySnapshot.forEach((doc) => {
        teams.push({ firebaseId: doc.id, ...doc.data() });
    });
    return teams;
}

async function fetchMyTeam(email) {
    const q = query(teamsCollection, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { firebaseId: doc.id, ...doc.data() };
    }
    return null;
}

function startCountdown() {
    const date = new Date("january 24, 2026 09:00:00").getTime();
    setInterval(() => {
        const now = new Date().getTime();
        const dist = date - now;
        if(dist < 0) return;
        
        const d = Math.floor(dist / (1000 * 60 * 60 * 24));
        const h = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((dist % (1000 * 60)) / 1000);

        if(document.getElementById("days")) {
            document.getElementById("days").innerText = d < 10 ? "0"+d : d;
            document.getElementById("hours").innerText = h < 10 ? "0"+h : h;
            document.getElementById("minutes").innerText = m < 10 ? "0"+m : m;
            document.getElementById("seconds").innerText = s < 10 ? "0"+s : s;
        }
    }, 1000);
}

// ==================================================
// 10. USER PROFILE SYSTEM
// ==================================================

// متغير لتخزين الصورة الجديدة (Base64)
let newProfileImageBase64 = null;

// 1. دالة عرض الصورة بمجرد اختيارها (Preview)
window.previewProfileImage = function(event) {
    const file = event.target.files[0];
    if (file) {
        // التحقق من الحجم (أقل من 1 ميجا عشان Firestore يستحمل)
        if (file.size > 1024 * 1024) {
            alert("Image is too large! Please choose an image under 1MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profileImagePreview').src = e.target.result;
            newProfileImageBase64 = e.target.result; // نخزن النص عشان نرفعه
        }
        reader.readAsDataURL(file);
    }
}

// 2. دالة تحديث بيانات البروفايل
window.updateUserProfile = async function(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    btn.innerText = "Saving..."; btn.disabled = true;

    try {
        const newName = document.getElementById('editProfileName').value;
        const newPass = document.getElementById('editProfilePass').value;
        
        // البحث عن وثيقة المستخدم في الـ Collection
        const q = query(usersCollection, where("email", "==", currentUser.email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userRef = doc(db, "users", userDoc.id);

            // تجهيز البيانات للتحديث
            let updateData = { name: newName };
            
            // لو غير الباسورد
            if (newPass.trim() !== "") {
                updateData.password = newPass;
            }

            // لو رفع صورة جديدة
            if (newProfileImageBase64) {
                updateData.profilePic = newProfileImageBase64;
            }

            // تحديث الفيربيس
            await updateDoc(userRef, updateData);

            // تحديث البيانات المحلية (Local Storage)
            currentUser.name = newName;
            if (newProfileImageBase64) currentUser.profilePic = newProfileImageBase64;
            
            saveUserSession(currentUser); // تحديث السيشن
            
            alert("Profile Updated Successfully!");
        }

    } catch (e) {
        console.error(e);
        alert("Error updating profile.");
    }
    btn.innerText = "Save Changes"; btn.disabled = false;
}

// 3. دالة لتحميل بيانات البروفايل عند فتح الصفحة
async function loadProfileData() {
    if (!currentUser) return;

    // جلب أحدث بيانات من السيرفر (عشان لو عدل من جهاز تاني)
    const q = query(usersCollection, where("email", "==", currentUser.email));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        
        document.getElementById('editProfileName').value = userData.name;
        document.getElementById('editProfileEmail').value = userData.email;
        document.getElementById('profileNameDisplay').innerText = userData.name;
        
        // عرض الصورة لو موجودة
        if (userData.profilePic) {
            document.getElementById('profileImagePreview').src = userData.profilePic;
        } else {
            // صورة افتراضية
            document.getElementById('profileImagePreview').src = "https://via.placeholder.com/150"; 
        }
    }
}