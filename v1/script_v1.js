// 全局变量
let currentRoom = null;
let roomTimer = null;
let rooms = {};
let products = {};
let rates = {
    hall: 50, // 大厅费率(元/4小时)
    privateRooms: {}, // 包房费率
    ac: 5, // 空调费率(元/小时)
    heater: 3, // 烤火费率(元/小时)
    overnight: 10, // 过夜费率(元/小时，凌晨12点-8点)
    sessionHours: 4 // 一场的时长（小时）
};
let transactions = []; // 交易记录
let users = {}; // 用户数据
let currentUser = null; // 当前登录用户

// 权限管理
const PERMISSIONS = {
    admin: ['all'],
    operator: ['room_management', 'product_sales', 'view_reports']
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeData();
    checkLoginStatus();
});

// 初始化数据
function initializeData() {
    // 从localStorage加载数据
    const savedRooms = localStorage.getItem('teahouse_rooms');
    const savedProducts = localStorage.getItem('teahouse_products');
    const savedRates = localStorage.getItem('teahouse_rates');
    const savedTransactions = localStorage.getItem('teahouse_transactions');

    if (savedRooms) {
        rooms = JSON.parse(savedRooms);
    } else {
        // 初始化房间状态
        const allRooms = ['大雅01', '大雅02', '小雅801', '小雅802', '小雅803', '小雅805', '小雅806', '小雅807', '小雅808', '小雅809', '大厅1', '大厅2', '大厅3', '大厅4', '大厅5', '大厅6', '大厅7', '大厅8', '大厅9', '大厅10'];
        allRooms.forEach(room => {
            rooms[room] = {
                status: 'idle',
                startTime: null,
                products: [],
                loans: [],  // 改为数组，存储每个客户的借款记录
                totalFee: 0,
                services: {  // 添加服务记录
                    ac: {
                        active: false,
                        startTime: null,
                        pausedTime: 0,
                        pauseStart: null,
                        isPaused: false,
                        sessions: [] // 记录多次开启的会话
                    },
                    heater: {
                        active: false,
                        startTime: null,
                        pausedTime: 0,
                        pauseStart: null,
                        isPaused: false,
                        sessions: [] // 记录多次开启的会话
                    }
                }
            };
        });
    }

    if (savedProducts) {
        products = JSON.parse(savedProducts);
    } else {
        // 初始化默认商品
        products = {
            '龙井茶': { price: 30, stock: 100 },
            '铁观音': { price: 35, stock: 80 },
            '普洱茶': { price: 40, stock: 60 },
            '绿茶': { price: 25, stock: 120 },
            '花茶': { price: 28, stock: 90 }
        };
    }

    if (savedRates) {
        rates = JSON.parse(savedRates);
    } else {
        // 初始化包房费率
        const privateRooms = ['大雅01', '大雅02', '小雅801', '小雅802', '小雅803', '小雅805', '小雅806', '小雅807', '小雅808', '小雅809'];
        privateRooms.forEach(room => {
            rates.privateRooms[room] = room.startsWith('大雅') ? 80 : 60;
        });
    }

    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
    }

    // 初始化用户数据
    const savedUsers = localStorage.getItem('teahouse_users');
    if (savedUsers) {
        users = JSON.parse(savedUsers);
        // 确保管理员密码是最新的
        if (users.admin && users.admin.password !== 'xj123456') {
            users.admin.password = 'xj123456';
            localStorage.setItem('teahouse_users', JSON.stringify(users));
        }
    } else {
        // 创建默认管理员账户
        users = {
            'admin': { 
                password: 'xj123456', 
                role: 'admin', 
                name: '系统管理员' 
            }
        };
        localStorage.setItem('teahouse_users', JSON.stringify(users));
    }

    // 初始化房间数据结构，支持暂停功能
    Object.keys(rooms).forEach(roomName => {
        if (!rooms[roomName].hasOwnProperty('pausedTime')) {
            rooms[roomName].pausedTime = 0;
            rooms[roomName].pauseStart = null;
            rooms[roomName].isPaused = false;
        }
    });
}

// 保存数据到localStorage
function saveData() {
    localStorage.setItem('teahouse_rooms', JSON.stringify(rooms));
    localStorage.setItem('teahouse_products', JSON.stringify(products));
    localStorage.setItem('teahouse_rates', JSON.stringify(rates));
    localStorage.setItem('teahouse_transactions', JSON.stringify(transactions));
    localStorage.setItem('teahouse_users', JSON.stringify(users));
}

// 检查登录状态
function checkLoginStatus() {
    const savedUser = localStorage.getItem('teahouse_current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainSystem();
    } else {
        showLoginPage();
    }
}

// 显示登录界面
function showLoginPage() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById('login-page').classList.add('active');
}

// 显示主系统
function showMainSystem() {
    document.getElementById('current-user').textContent = currentUser.name;
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById('main-page').classList.add('active');
    
    // 初始化系统数据
    loadProducts();
    loadRoomRates();
    updateRoomDisplay();
    setDefaultDate();
    updatePermissions();
    setupAutoDownload(); // 启动自动下载功能
    
    // 添加脚注动画效果
    initFooterAnimation();
}

// 登录功能
function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!username || !password) {
        alert('请输入用户名和密码');
        return;
    }
    
    if (!users[username] || users[username].password !== password) {
        alert('用户名或密码错误');
        return;
    }
    
    currentUser = users[username];
    currentUser.username = username;
    localStorage.setItem('teahouse_current_user', JSON.stringify(currentUser));
    
    showMainSystem();
    
    // 清空登录表单
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
}

// 登录页面回车键支持
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.getElementById('login-page').classList.contains('active')) {
        login();
    }
});

// 退出登录
function logout() {
    if (confirm('确认退出登录？')) {
        localStorage.removeItem('teahouse_current_user');
        currentUser = null;
        currentRoom = null;
        
        // 停止计时器
        if (roomTimer) {
            clearInterval(roomTimer);
            roomTimer = null;
        }
        
        showLoginPage();
    }
}

// 更新权限显示
function updatePermissions() {
    if (!currentUser) return;
    
    // 管理员可以看到所有功能
    if (currentUser.role === 'admin') {
        document.getElementById('user-management-tab').style.display = 'block';
        document.getElementById('clear-reports-btn').style.display = 'inline-block';
    } else {
        document.getElementById('user-management-tab').style.display = 'none';
        document.getElementById('clear-reports-btn').style.display = 'none';
    }
}

// 检查权限
function hasPermission(permission) {
    if (!currentUser) return false;
    
    const userPermissions = PERMISSIONS[currentUser.role] || [];
    return userPermissions.includes('all') || userPermissions.includes(permission);
}

// 页面切换
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    // 确保脚注始终显示
    const footer = document.getElementById('page-footer');
    if (footer) {
        footer.style.display = 'block';
    }
    
    if (pageId === 'admin-page') {
        loadAdminData();
    } else if (pageId === 'report-page') {
        setDefaultDate();
    }
}

// 更新房间显示
function updateRoomDisplay() {
    document.querySelectorAll('.room-button').forEach(button => {
        const roomName = button.dataset.room;
        const room = rooms[roomName];
        const statusElement = button.querySelector('.room-status');
        
        button.className = `room-button ${room.status}`;
        
        switch(room.status) {
            case 'idle':
                statusElement.textContent = '空闲';
                break;
            case 'occupied':
                statusElement.textContent = '使用中';
                break;
            case 'reserved':
                statusElement.textContent = '预留';
                break;
        }
    });
}

// 选择房间
function selectRoom(roomName) {
    currentRoom = roomName;
    document.getElementById('room-title').textContent = `${roomName} - 房间管理`;
    updateRoomInfo();
    showPage('room-page');
}

// 更新房间信息显示
function updateRoomInfo() {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    
    // 确保服务对象存在
    if (!room.services) {
        room.services = { ac: false, heater: false };
    }
    
    // 更新计费信息
    if (room.startTime) {
        document.getElementById('start-time').textContent = new Date(room.startTime).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'});
        updateDuration();
    } else {
        document.getElementById('start-time').textContent = '--';
        document.getElementById('duration').textContent = '0小时0分钟';
        document.getElementById('paused-duration').textContent = '0小时0分钟';
        document.getElementById('actual-duration').textContent = '0小时0分钟';
        document.getElementById('room-fee').textContent = '0元';
        document.getElementById('pause-status').style.display = 'none';
    }
    
    // 更新服务选项状态和费率显示 - 确保每个房间完全独立
    // 正确检查服务对象结构，确保每个房间的UI独立显示
    const acActive = room.services.ac && typeof room.services.ac === 'object' && room.services.ac.active;
    const heaterActive = room.services.heater && typeof room.services.heater === 'object' && room.services.heater.active;
    document.getElementById('ac-service').checked = acActive || false;
    document.getElementById('heater-service').checked = heaterActive || false;
    document.getElementById('ac-rate-display').textContent = rates.ac || 5;
    document.getElementById('heater-rate-display').textContent = rates.heater || 3;
    
    // 关键：切换房间时，根据当前房间的服务状态更新显示
    // 空调服务显示更新
    if (acActive) {
        updateServiceDisplay('ac');
    } else {
        // 隐藏空调的计时信息
        document.getElementById('ac-timing').style.display = 'none';
        document.getElementById('pause-ac-btn').style.display = 'none';
        document.getElementById('resume-ac-btn').style.display = 'none';
        document.getElementById('stop-ac-btn').style.display = 'none';
    }
    
    // 烤火服务显示更新
    if (heaterActive) {
        updateServiceDisplay('heater');
    } else {
        // 隐藏烤火的计时信息
        document.getElementById('heater-timing').style.display = 'none';
        document.getElementById('pause-heater-btn').style.display = 'none';
        document.getElementById('resume-heater-btn').style.display = 'none';
        document.getElementById('stop-heater-btn').style.display = 'none';
    }
    
    // 更新商品列表
    updateCart();
    
    // 更新借贷信息
    updateLoanDisplay();
    
    // 更新总计
    updateTotal();
    
    // 更新暂停按钮
    updatePauseButtons();
}

// 开房
function startRoom() {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    if (room.status === 'occupied') {
        alert('房间已在使用中');
        return;
    }
    
    room.status = 'occupied';
    room.startTime = Date.now();
    room.products = [];
    room.loans = [];  // 修改为数组
    room.pausedTime = 0;
    room.pauseStart = null;
    room.isPaused = false;
    room.services = { ac: false, heater: false }; // 重置服务状态
    
    saveData();
    updateRoomDisplay();
    updateRoomInfo();
    startTimer();
    
    alert('开房成功');
}

// 预留房间
function reserveRoom() {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    if (room.status === 'occupied') {
        alert('房间正在使用中，无法预留');
        return;
    }
    
    room.status = 'reserved';
    saveData();
    updateRoomDisplay();
    
    alert('房间预留成功');
}

// 开始计时器
function startTimer() {
    if (roomTimer) clearInterval(roomTimer);
    
    // 根据配置的时长决定更新频率
    const sessionHours = rates.sessionHours || 4;
    let updateInterval;
    
    if (sessionHours < 0.01) { // 小于36秒，每秒更新
        updateInterval = 1000;
    } else if (sessionHours < 0.1) { // 小于6分钟，每5秒更新
        updateInterval = 5000;
    } else if (sessionHours < 1) { // 小于1小时，每30秒更新
        updateInterval = 30000;
    } else { // 1小时及以上，每分钟更新
        updateInterval = 60000;
    }
    
    roomTimer = setInterval(() => {
        if (currentRoom && rooms[currentRoom].status === 'occupied') {
            updateDuration();
            updateTotal();
            // 更新服务显示 - 只更新当前房间的服务
            ['ac', 'heater'].forEach(serviceType => {
                const room = rooms[currentRoom];
                if (room.services && room.services[serviceType] && typeof room.services[serviceType] === 'object' && room.services[serviceType].active) {
                    updateServiceDisplay(serviceType);
                } else {
                    // 如果服务未激活，确保隐藏对应的时间显示
                    const timingDiv = document.getElementById(`${serviceType}-timing`);
                    const pauseBtn = document.getElementById(`pause-${serviceType}-btn`);
                    const resumeBtn = document.getElementById(`resume-${serviceType}-btn`);
                    const stopBtn = document.getElementById(`stop-${serviceType}-btn`);
                    
                    if (timingDiv) timingDiv.style.display = 'none';
                    if (pauseBtn) pauseBtn.style.display = 'none';
                    if (resumeBtn) resumeBtn.style.display = 'none';
                    if (stopBtn) stopBtn.style.display = 'none';
                }
            });
        }
    }, updateInterval);
}

// 更新使用时长
function updateDuration() {
    if (!currentRoom || !rooms[currentRoom].startTime) return;
    
    const room = rooms[currentRoom];
    const startTime = room.startTime;
    let totalDuration = Date.now() - startTime;
    
    // 如果当前正在暂停，需要减去暂停的时间
    let pausedTime = room.pausedTime || 0;
    if (room.isPaused && room.pauseStart) {
        pausedTime += Date.now() - room.pauseStart;
    }
    
    // 实际使用时长 = 总时长 - 暂停时长
    const actualDuration = totalDuration - pausedTime;
    
    // 显示总时长
    const totalHours = Math.floor(totalDuration / (1000 * 60 * 60));
    const totalMinutes = Math.floor((totalDuration % (1000 * 60 * 60)) / (1000 * 60));
    document.getElementById('duration').textContent = `${totalHours}小时${totalMinutes}分钟`;
    
    // 显示暂停时长
    const pausedHours = Math.floor(pausedTime / (1000 * 60 * 60));
    const pausedMinutes = Math.floor((pausedTime % (1000 * 60 * 60)) / (1000 * 60));
    document.getElementById('paused-duration').textContent = `${pausedHours}小时${pausedMinutes}分钟`;
    
    // 显示实际时长
    const actualHours = Math.floor(actualDuration / (1000 * 60 * 60));
    const actualMinutes = Math.floor((actualDuration % (1000 * 60 * 60)) / (1000 * 60));
    document.getElementById('actual-duration').textContent = `${actualHours}小时${actualMinutes}分钟`;
    
    // 根据实际时长计算房费 - 使用精确的小时数而不是整数小时
    const rate = currentRoom.startsWith('大厅') ? rates.hall : rates.privateRooms[currentRoom];
    const sessionHours = rates.sessionHours || 4; // 使用配置的时长，默认4小时
    const actualHoursDecimal = actualDuration / (1000 * 60 * 60); // 精确的小时数
    const sessions = Math.ceil(actualHoursDecimal / sessionHours) || 1;
    const roomFee = sessions * rate;
    
    document.getElementById('room-fee').textContent = `${roomFee}元`;
    
    // 显示取整选项 - 只要有使用时长就显示选项，让用户选择
    if (actualHoursDecimal > 0) {
        const upSessions = Math.ceil(actualHoursDecimal / sessionHours) || 1;
        const downSessions = Math.floor(actualHoursDecimal / sessionHours) || 1;
        
        // 只有向上和向下取整结果不同时才显示选项
        if (upSessions !== downSessions) {
            document.querySelector('.rounding-options').style.display = 'flex';
        } else {
            document.querySelector('.rounding-options').style.display = 'none';
        }
    } else {
        document.querySelector('.rounding-options').style.display = 'none';
    }
    
    // 更新暂停状态显示
    updatePauseButtons();
}

// 暂停计时
function pauseRoom() {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    if (room.status !== 'occupied') {
        alert('房间未在使用中');
        return;
    }
    
    if (room.isPaused) {
        alert('房间已经暂停');
        return;
    }
    
    room.isPaused = true;
    room.pauseStart = Date.now();
    
    saveData();
    updatePauseButtons();
    document.getElementById('pause-status').style.display = 'block';
    
    alert('计时已暂停');
}

// 继续计时
function resumeRoom() {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    if (room.status !== 'occupied') {
        alert('房间未在使用中');
        return;
    }
    
    if (!room.isPaused) {
        alert('房间未暂停');
        return;
    }
    
    // 累计暂停时长
    if (room.pauseStart) {
        room.pausedTime = (room.pausedTime || 0) + (Date.now() - room.pauseStart);
    }
    
    room.isPaused = false;
    room.pauseStart = null;
    
    saveData();
    updatePauseButtons();
    document.getElementById('pause-status').style.display = 'none';
    
    alert('计时已恢复');
}

// 更新暂停按钮显示
function updatePauseButtons() {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    const pauseBtn = document.querySelector('.pause-btn');
    const resumeBtn = document.querySelector('.resume-btn');
    
    if (room.status === 'occupied') {
        if (room.isPaused) {
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'inline-block';
        } else {
            pauseBtn.style.display = 'inline-block';
            resumeBtn.style.display = 'none';
        }
    } else {
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'none';
    }
}

// 计算账单（向上或向下取整）
function calculateBill(direction) {
    if (!currentRoom || !rooms[currentRoom].startTime) return;
    
    const room = rooms[currentRoom];
    const startTime = room.startTime;
    
    // 计算实际使用时长
    let totalDuration = Date.now() - startTime;
    let pausedTime = room.pausedTime || 0;
    if (room.isPaused && room.pauseStart) {
        pausedTime += Date.now() - room.pauseStart;
    }
    const actualDuration = totalDuration - pausedTime;
    const actualHours = actualDuration / (1000 * 60 * 60);
    
    const rate = currentRoom.startsWith('大厅') ? rates.hall : rates.privateRooms[currentRoom];
    const sessionHours = rates.sessionHours || 4; // 使用配置的时长，默认4小时
    
    let sessions;
    if (direction === 'up') {
        sessions = Math.ceil(actualHours / sessionHours) || 1;
    } else {
        sessions = Math.floor(actualHours / sessionHours) || 1;
    }
    
    const roomFee = sessions * rate;
    document.getElementById('room-fee').textContent = `${roomFee}元`;
    document.querySelector('.rounding-options').style.display = 'none';
    
    updateTotal();
}

// 加载商品到选择列表
function loadProducts() {
    const select = document.getElementById('product-select');
    select.innerHTML = '<option value="">选择商品</option>';
    
    Object.keys(products).forEach(productName => {
        const option = document.createElement('option');
        option.value = productName;
        option.textContent = `${productName} - ${products[productName].price}元`;
        select.appendChild(option);
    });
}

// 添加商品到购物车
function addProduct() {
    const productName = document.getElementById('product-select').value;
    const quantity = parseInt(document.getElementById('product-quantity').value) || 1;
    
    if (!productName) {
        alert('请选择商品');
        return;
    }
    
    if (!currentRoom) return;
    
    // 检查房间是否已开房
    if (rooms[currentRoom].status !== 'occupied') {
        alert('请先开房再添加商品');
        return;
    }
    
    const product = products[productName];
    if (product.stock < quantity) {
        alert('库存不足');
        return;
    }
    
    // 检查购物车中是否已有该商品
    const existingItem = rooms[currentRoom].products.find(item => item.name === productName);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        rooms[currentRoom].products.push({
            name: productName,
            price: product.price,
            quantity: quantity
        });
    }
    
    // 更新库存
    products[productName].stock -= quantity;
    
    saveData();
    updateCart();
    updateTotal();
    loadProducts(); // 重新加载商品列表
    
    // 重置选择
    document.getElementById('product-select').value = '';
    document.getElementById('product-quantity').value = 1;
}

// 更新购物车显示
function updateCart() {
    if (!currentRoom) return;
    
    const cartElement = document.getElementById('cart-items');
    cartElement.innerHTML = '';
    
    let productTotal = 0;
    
    rooms[currentRoom].products.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <span>${item.name} x${item.quantity}</span>
            <span>${item.price * item.quantity}元</span>
            <button onclick="removeProduct(${index})">删除</button>
        `;
        cartElement.appendChild(itemElement);
        
        productTotal += item.price * item.quantity;
    });
    
    document.getElementById('product-total').textContent = `${productTotal}元`;
}

// 删除商品
function removeProduct(index) {
    if (!currentRoom) return;
    
    const item = rooms[currentRoom].products[index];
    
    // 恢复库存
    products[item.name].stock += item.quantity;
    
    // 从购物车删除
    rooms[currentRoom].products.splice(index, 1);
    
    saveData();
    updateCart();
    updateTotal();
    loadProducts();
}

// 借钱
function addLoan() {
    const customerName = document.getElementById('loan-customer-name').value.trim();
    const amount = parseFloat(document.getElementById('loan-amount').value);
    
    if (!customerName) {
        alert('请输入客户姓名');
        return;
    }
    
    if (!amount || amount <= 0) {
        alert('请输入有效金额');
        return;
    }
    
    if (!currentRoom) return;
    
    // 检查房间是否已开房
    if (rooms[currentRoom].status !== 'occupied') {
        alert('请先开房再借钱');
        return;
    }
    
    // 确保loans是数组
    if (!Array.isArray(rooms[currentRoom].loans)) {
        rooms[currentRoom].loans = [];
    }
    
    // 查找是否已有该客户的借款记录
    const existingLoan = rooms[currentRoom].loans.find(loan => loan.customerName === customerName);
    if (existingLoan) {
        existingLoan.amount += amount;
    } else {
        rooms[currentRoom].loans.push({
            customerName: customerName,
            amount: amount
        });
    }
    
    document.getElementById('loan-customer-name').value = '';
    document.getElementById('loan-amount').value = '';
    
    updateLoanDisplay();
    saveData();
    updateTotal();
    
    alert(`${customerName}借款${amount}元成功`);
}

// 还钱
function repayLoan() {
    const customerName = document.getElementById('repay-customer').value;
    const amount = parseFloat(document.getElementById('repay-amount').value);
    const method = document.getElementById('repay-method').value;
    
    if (!customerName) {
        alert('请选择客户');
        return;
    }
    
    if (!amount || amount <= 0) {
        alert('请输入有效金额');
        return;
    }
    
    if (!currentRoom) return;
    
    // 确保loans是数组
    if (!Array.isArray(rooms[currentRoom].loans)) {
        rooms[currentRoom].loans = [];
    }
    
    const loanIndex = rooms[currentRoom].loans.findIndex(loan => loan.customerName === customerName);
    if (loanIndex === -1) {
        alert('未找到该客户的借款记录');
        return;
    }
    
    const loan = rooms[currentRoom].loans[loanIndex];
    if (amount > loan.amount) {
        alert(`还款金额超过${customerName}的欠款金额(${loan.amount}元)`);
        return;
    }
    
    loan.amount -= amount;
    
    // 如果还清了，删除记录
    if (loan.amount === 0) {
        rooms[currentRoom].loans.splice(loanIndex, 1);
    }
    
    document.getElementById('repay-amount').value = '';
    document.getElementById('repay-customer').value = '';
    
    updateLoanDisplay();
    saveData();
    updateTotal();
    
    alert(`${customerName}通过${method}还款${amount}元成功`);
}

// 更新借贷显示
function updateLoanDisplay() {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    const loanListDiv = document.getElementById('loan-list');
    const repayCustomerSelect = document.getElementById('repay-customer');
    
    // 确保loans是数组
    if (!Array.isArray(room.loans)) {
        room.loans = [];
    }
    
    // 更新借款列表显示
    loanListDiv.innerHTML = '';
    let totalLoanAmount = 0;
    
    room.loans.forEach((loan, index) => {
        const loanDiv = document.createElement('div');
        loanDiv.className = 'loan-item';
        loanDiv.innerHTML = `
            <span>${loan.customerName}: ${loan.amount}元</span>
            <button onclick="deleteLoan(${index})" style="margin-left: 10px;">删除</button>
        `;
        loanListDiv.appendChild(loanDiv);
        totalLoanAmount += loan.amount;
    });
    
    // 更新还钱客户选择列表
    repayCustomerSelect.innerHTML = '<option value="">选择客户</option>';
    room.loans.forEach(loan => {
        const option = document.createElement('option');
        option.value = loan.customerName;
        option.textContent = `${loan.customerName} (欠款: ${loan.amount}元)`;
        repayCustomerSelect.appendChild(option);
    });
    
    // 更新总欠款显示
    document.getElementById('loan-total').textContent = `${totalLoanAmount}元`;
}

// 删除借款记录
function deleteLoan(index) {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    if (!Array.isArray(room.loans) || index >= room.loans.length) return;
    
    const loan = room.loans[index];
    if (confirm(`确认删除${loan.customerName}的借款记录(${loan.amount}元)？`)) {
        room.loans.splice(index, 1);
        updateLoanDisplay();
        saveData();
        updateTotal();
    }
}

// 切换服务状态
function toggleService(serviceType) {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    if (room.status !== 'occupied') {
        alert('请先开房再选择服务');
        document.getElementById(`${serviceType}-service`).checked = false;
        return;
    }
    
    // 确保服务对象存在且结构正确
    if (!room.services || !room.services[serviceType]) {
        initializeServiceStructure(room);
    }
    
    const service = room.services[serviceType];
    const isChecked = document.getElementById(`${serviceType}-service`).checked;
    
    if (isChecked && !service.active) {
        // 开始服务
        startService(serviceType);
    } else if (!isChecked && service.active) {
        // 停止服务
        stopService(serviceType);
    }
    
    updateServiceDisplay(serviceType);
    saveData();
    updateTotal();
}

// 初始化服务数据结构
function initializeServiceStructure(room) {
    if (!room.services) {
        room.services = {};
    }
    
    ['ac', 'heater'].forEach(serviceType => {
        if (!room.services[serviceType] || typeof room.services[serviceType] === 'boolean') {
            room.services[serviceType] = {
                active: false,
                startTime: null,
                pausedTime: 0,
                pauseStart: null,
                isPaused: false,
                sessions: []
            };
        }
    });
}

// 开始服务
function startService(serviceType) {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    const service = room.services[serviceType];
    
    if (service.active) {
        alert(`${serviceType === 'ac' ? '空调' : '烤火'}已经在运行中`);
        return;
    }
    
    // 开始新的服务会话
    service.active = true;
    service.startTime = Date.now();
    service.pausedTime = 0;
    service.pauseStart = null;
    service.isPaused = false;
    
    // 记录会话开始
    service.sessions.push({
        startTime: Date.now(),
        endTime: null,
        pausedTime: 0
    });
    
    document.getElementById(`${serviceType}-service`).checked = true;
    updateServiceDisplay(serviceType);
    saveData();
    
    alert(`${serviceType === 'ac' ? '空调' : '烤火'}已开始`);
}

// 暂停服务
function pauseService(serviceType) {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    const service = room.services[serviceType];
    
    if (!service.active) {
        alert(`${serviceType === 'ac' ? '空调' : '烤火'}未在运行中`);
        return;
    }
    
    if (service.isPaused) {
        alert(`${serviceType === 'ac' ? '空调' : '烤火'}已经暂停`);
        return;
    }
    
    service.isPaused = true;
    service.pauseStart = Date.now();
    
    updateServiceDisplay(serviceType);
    saveData();
    
    alert(`${serviceType === 'ac' ? '空调' : '烤火'}已暂停`);
}

// 继续服务
function resumeService(serviceType) {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    const service = room.services[serviceType];
    
    if (!service.active) {
        alert(`${serviceType === 'ac' ? '空调' : '烤火'}未在运行中`);
        return;
    }
    
    if (!service.isPaused) {
        alert(`${serviceType === 'ac' ? '空调' : '烤火'}未暂停`);
        return;
    }
    
    // 累计暂停时长
    if (service.pauseStart) {
        service.pausedTime += Date.now() - service.pauseStart;
        
        // 更新当前会话的暂停时长
        const currentSession = service.sessions[service.sessions.length - 1];
        if (currentSession && !currentSession.endTime) {
            currentSession.pausedTime += Date.now() - service.pauseStart;
        }
    }
    
    service.isPaused = false;
    service.pauseStart = null;
    
    updateServiceDisplay(serviceType);
    saveData();
    
    alert(`${serviceType === 'ac' ? '空调' : '烤火'}已继续`);
}

// 停止服务
function stopService(serviceType) {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    const service = room.services[serviceType];
    
    if (!service.active) {
        return; // 服务未运行，直接返回
    }
    
    // 如果正在暂停，先处理暂停时长
    if (service.isPaused && service.pauseStart) {
        service.pausedTime += Date.now() - service.pauseStart;
        
        // 更新当前会话的暂停时长
        const currentSession = service.sessions[service.sessions.length - 1];
        if (currentSession && !currentSession.endTime) {
            currentSession.pausedTime += Date.now() - service.pauseStart;
        }
    }
    
    // 结束当前会话
    const currentSession = service.sessions[service.sessions.length - 1];
    if (currentSession && !currentSession.endTime) {
        currentSession.endTime = Date.now();
    }
    
    // 重置服务状态
    service.active = false;
    service.startTime = null;
    service.pausedTime = 0;
    service.pauseStart = null;
    service.isPaused = false;
    
    document.getElementById(`${serviceType}-service`).checked = false;
    updateServiceDisplay(serviceType);
    saveData();
    updateTotal();
    
    alert(`${serviceType === 'ac' ? '空调' : '烤火'}已停止`);
}

// 更新服务显示 - 完全重构，确保每个房间独立显示
function updateServiceDisplay(serviceType) {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    const service = room.services[serviceType];
    
    if (!service) return;
    
    const serviceName = serviceType === 'ac' ? '空调' : '烤火';
    const timingDiv = document.getElementById(`${serviceType}-timing`);
    const pauseBtn = document.getElementById(`pause-${serviceType}-btn`);
    const resumeBtn = document.getElementById(`resume-${serviceType}-btn`);
    const stopBtn = document.getElementById(`stop-${serviceType}-btn`);
    
    // 只有当前房间选择了对应服务，才显示时间信息和控制按钮
    if (service.active) {
        // 显示计时信息
        timingDiv.style.display = 'block';
        
        // 计算时长
        const now = Date.now();
        let totalDuration = now - service.startTime;
        let pausedTime = service.pausedTime;
        
        if (service.isPaused && service.pauseStart) {
            pausedTime += now - service.pauseStart;
        }
        
        const actualDuration = totalDuration - pausedTime;
        
        // 更新显示
        document.getElementById(`${serviceType}-start-time`).textContent = 
            new Date(service.startTime).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'});
        
        const totalHours = Math.floor(totalDuration / (1000 * 60 * 60));
        const totalMinutes = Math.floor((totalDuration % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById(`${serviceType}-duration`).textContent = `${totalHours}小时${totalMinutes}分钟`;
        
        const pausedHours = Math.floor(pausedTime / (1000 * 60 * 60));
        const pausedMinutes = Math.floor((pausedTime % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById(`${serviceType}-paused-duration`).textContent = `${pausedHours}小时${pausedMinutes}分钟`;
        
        const status = service.isPaused ? '暂停中' : '运行中';
        document.getElementById(`${serviceType}-status`).textContent = status;
        
        // 更新按钮显示
        if (service.isPaused) {
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'inline-block';
        } else {
            pauseBtn.style.display = 'inline-block';
            resumeBtn.style.display = 'none';
        }
        stopBtn.style.display = 'inline-block';
        
    } else {
        // 隐藏计时信息和按钮 - 只有当前房间没选择对应服务时才隐藏
        timingDiv.style.display = 'none';
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        
        // 重置显示
        document.getElementById(`${serviceType}-start-time`).textContent = '--';
        document.getElementById(`${serviceType}-duration`).textContent = '0小时0分钟';
        document.getElementById(`${serviceType}-paused-duration`).textContent = '0小时0分钟';
        document.getElementById(`${serviceType}-status`).textContent = '停止';
    }
}

// 计算服务费
function calculateServiceFee() {
    if (!currentRoom || !rooms[currentRoom].startTime) return 0;
    
    const room = rooms[currentRoom];
    if (!room.services) return 0;
    
    let serviceFee = 0;
    
    // 计算空调费用
    if (room.services.ac && typeof room.services.ac === 'object') {
        serviceFee += calculateIndividualServiceFee('ac');
    }
    
    // 计算烤火费用
    if (room.services.heater && typeof room.services.heater === 'object') {
        serviceFee += calculateIndividualServiceFee('heater');
    }
    
    return Math.round(serviceFee * 100) / 100; // 保留两位小数
}

// 计算单个服务的费用
function calculateIndividualServiceFee(serviceType) {
    if (!currentRoom) return 0;
    
    const room = rooms[currentRoom];
    const service = room.services[serviceType];
    
    if (!service || (!service.active && service.sessions.length === 0)) return 0;
    
    let totalHours = 0;
    const rate = rates[serviceType] || (serviceType === 'ac' ? 5 : 3);
    
    // 计算所有已完成会话的时长
    service.sessions.forEach(session => {
        if (session.endTime) {
            const sessionDuration = session.endTime - session.startTime;
            const sessionPausedTime = session.pausedTime || 0;
            const actualSessionDuration = sessionDuration - sessionPausedTime;
            totalHours += actualSessionDuration / (1000 * 60 * 60);
        }
    });
    
    // 如果当前服务正在运行，计算当前会话时长
    if (service.active && service.startTime) {
        const currentSessionDuration = Date.now() - service.startTime;
        let currentPausedTime = service.pausedTime || 0;
        
        if (service.isPaused && service.pauseStart) {
            currentPausedTime += Date.now() - service.pauseStart;
        }
        
        const actualCurrentDuration = currentSessionDuration - currentPausedTime;
        totalHours += actualCurrentDuration / (1000 * 60 * 60);
    }
    
    // 向上取整到1小时（和过夜费一样的计算方式）
    const billingHours = Math.ceil(totalHours);
    
    return billingHours * rate;
}

// 计算过夜费
function calculateOvernightFee() {
    if (!currentRoom || !rooms[currentRoom].startTime) return 0;

    const room = rooms[currentRoom];
    const start = new Date(room.startTime);
    // 暂停即停止计时：若当前处于暂停中，则以暂停开始时间作为计算终点
    const end = (room.isPaused && room.pauseStart) ? new Date(room.pauseStart) : new Date();

    // 对齐到整点边界，逐小时判断与 [start, end) 是否有重叠
    const hourStart = new Date(start);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(end);
    if (hourEnd.getMinutes() !== 0 || hourEnd.getSeconds() !== 0 || hourEnd.getMilliseconds() !== 0) {
        hourEnd.setHours(hourEnd.getHours() + 1, 0, 0, 0);
    }

    let overnightHours = 0;
    for (let t = new Date(hourStart); t < hourEnd; t.setHours(t.getHours() + 1)) {
        const slotStart = new Date(t);
        const slotEnd = new Date(t);
        slotEnd.setHours(slotEnd.getHours() + 1);

        // 与真实使用区间 [start, end) 是否有重叠
        const overlapStart = Math.max(slotStart.getTime(), start.getTime());
        const overlapEnd = Math.min(slotEnd.getTime(), end.getTime());
        const overlaps = overlapStart < overlapEnd;

        const h = slotStart.getHours();
        const isOvernightHour = h >= 0 && h < 8;

        if (isOvernightHour && overlaps) {
            overnightHours += 1; // 任意部分重叠即按“整小时”计费
        }
    }

    const rate = rates.overnight || 10;
    const fee = overnightHours * rate;
    return Math.round(fee * 100) / 100;
}

// 更新总计
function updateTotal() {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    
    // 房费
    const roomFeeText = document.getElementById('room-fee').textContent;
    const roomFee = parseFloat(roomFeeText.replace('元', '')) || 0;
    
    // 商品费
    const productTotal = room.products.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    // 服务费
    const serviceFee = calculateServiceFee();
    
    // 过夜费
    const overnightFee = calculateOvernightFee();
    
    // 总服务费（包括过夜费）
    const totalServiceFee = serviceFee + overnightFee;
    
    // 欠款 - 计算所有客户的借款总额
    let totalLoans = 0;
    if (Array.isArray(room.loans)) {
        totalLoans = room.loans.reduce((total, loan) => total + loan.amount, 0);
    } else if (typeof room.loans === 'number') {
        totalLoans = room.loans;
    }
    
    // 应收合计（不包含借款）
    const receivableTotal = roomFee + productTotal + totalServiceFee;
    
    document.getElementById('final-room-fee').textContent = `${roomFee}元`;
    document.getElementById('final-product-fee').textContent = `${productTotal}元`;
    document.getElementById('final-service-fee').textContent = `${totalServiceFee}元`;
    document.getElementById('service-fee').textContent = `${serviceFee}元`;
    document.getElementById('overnight-fee').textContent = `${overnightFee}元`;
    document.getElementById('final-loan').textContent = `${totalLoans}元`;
    document.getElementById('grand-total').textContent = `${receivableTotal}元`;
}

// 结账
function endRoom() {
    if (!currentRoom) return;
    
    const room = rooms[currentRoom];
    if (room.status !== 'occupied') {
        alert('房间未在使用中');
        return;
    }
    
    // 计算最终费用
    updateTotal();
    
    const roomFee = parseFloat(document.getElementById('final-room-fee').textContent.replace('元', '')) || 0;
    const productFee = parseFloat(document.getElementById('final-product-fee').textContent.replace('元', '')) || 0;
    const serviceFee = parseFloat(document.getElementById('final-service-fee').textContent.replace('元', '')) || 0;
    const loans = parseFloat(document.getElementById('final-loan').textContent.replace('元', '')) || 0;
    
    // 应收合计不包含借款（借款是独立计算）
    const receivableTotal = roomFee + productFee + serviceFee;
    
    // 检查借款提醒
    if (loans > 0) {
        if (!confirm(`注意：该房间还有${loans}元借款未还清！\n\n是否继续结账？`)) {
            return;
        }
    }
    
    // 显示付款方式选择弹窗
    showPaymentDialog(receivableTotal, roomFee, productFee, serviceFee, loans);
}

// 显示付款方式选择弹窗
function showPaymentDialog(receivableTotal, roomFee, productFee, serviceFee, loans) {
    // 创建弹窗HTML
    const dialogHTML = `
        <div id="payment-dialog" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 20px; border-radius: 10px; width: 90%; max-width: 500px; max-height: 80%; overflow-y: auto;">
                <h3 style="margin-top: 0;">结账付款</h3>
                
                <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
                    <h4>费用明细</h4>
                    <p>房费: ${roomFee}元</p>
                    <p>商品费: ${productFee}元</p>
                    <p>服务费: ${serviceFee}元</p>
                    <p style="font-weight: bold; color: #e74c3c;">应收合计: ${receivableTotal}元</p>
                    ${loans > 0 ? `<p style="color: #f39c12;">借款记录: ${loans}元（不计入收费）</p>` : ''}
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4>实收金额</h4>
                    <input type="number" id="actual-amount" value="0" step="0.01" readonly style="width: 100px; padding: 5px; margin-right: 10px; background-color: #f5f5f5;">元
                    <p id="discount-display" style="margin: 5px 0; color: #27ae60;">折扣: ${receivableTotal}元</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4>付款方式</h4>
                    <div id="payment-methods">
                        <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                            <label style="width: 60px; display: inline-block;">现金:</label>
                            <input type="number" id="cash-amount" value="0" step="0.01" style="width: 100px; padding: 5px;">元
                            <button onclick="setPaymentAmount('cash-amount', 0)" style="padding: 2px 6px; font-size: 12px; background: #95a5a6; color: white; border: none; border-radius: 3px; cursor: pointer;">最小</button>
                            <button onclick="setPaymentAmount('cash-amount', ${receivableTotal})" style="padding: 2px 6px; font-size: 12px; background: #3498db; color: white; border: none; border-radius: 3px; cursor: pointer;">最大</button>
                        </div>
                        <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                            <label style="width: 60px; display: inline-block;">微信:</label>
                            <input type="number" id="wechat-amount" value="0" step="0.01" style="width: 100px; padding: 5px;">元
                            <button onclick="setPaymentAmount('wechat-amount', 0)" style="padding: 2px 6px; font-size: 12px; background: #95a5a6; color: white; border: none; border-radius: 3px; cursor: pointer;">最小</button>
                            <button onclick="setPaymentAmount('wechat-amount', ${receivableTotal})" style="padding: 2px 6px; font-size: 12px; background: #3498db; color: white; border: none; border-radius: 3px; cursor: pointer;">最大</button>
                        </div>
                        <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                            <label style="width: 60px; display: inline-block;">支付宝:</label>
                            <input type="number" id="alipay-amount" value="0" step="0.01" style="width: 100px; padding: 5px;">元
                            <button onclick="setPaymentAmount('alipay-amount', 0)" style="padding: 2px 6px; font-size: 12px; background: #95a5a6; color: white; border: none; border-radius: 3px; cursor: pointer;">最小</button>
                            <button onclick="setPaymentAmount('alipay-amount', ${receivableTotal})" style="padding: 2px 6px; font-size: 12px; background: #3498db; color: white; border: none; border-radius: 3px; cursor: pointer;">最大</button>
                        </div>
                        <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                            <label style="width: 60px; display: inline-block;">银行卡:</label>
                            <input type="number" id="card-amount" value="0" step="0.01" style="width: 100px; padding: 5px;">元
                            <button onclick="setPaymentAmount('card-amount', 0)" style="padding: 2px 6px; font-size: 12px; background: #95a5a6; color: white; border: none; border-radius: 3px; cursor: pointer;">最小</button>
                            <button onclick="setPaymentAmount('card-amount', ${receivableTotal})" style="padding: 2px 6px; font-size: 12px; background: #3498db; color: white; border: none; border-radius: 3px; cursor: pointer;">最大</button>
                        </div>
                    </div>
                    <p id="payment-total" style="font-weight: bold; color: #2980b9;">付款总计: 0元</p>
                </div>
                
                <div style="text-align: right;">
                    <button onclick="cancelPayment()" style="margin-right: 10px; padding: 8px 15px; background: #95a5a6; color: white; border: none; border-radius: 3px; cursor: pointer;">取消</button>
                    <button onclick="confirmPayment(${receivableTotal}, ${roomFee}, ${productFee}, ${serviceFee}, ${loans})" style="padding: 8px 15px; background: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer;">确认结账</button>
                </div>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
    
    // 绑定事件监听器
    bindPaymentDialogEvents(receivableTotal);
}

// 绑定付款对话框事件
function bindPaymentDialogEvents(receivableTotal) {
    const paymentInputs = ['cash-amount', 'wechat-amount', 'alipay-amount', 'card-amount'];
    
    paymentInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => updatePaymentCalculation(receivableTotal));
        }
    });
    
    // 初始化计算
    updatePaymentCalculation(receivableTotal);
}

// 更新付款计算
function updatePaymentCalculation(receivableTotal) {
    const cashAmount = parseFloat(document.getElementById('cash-amount').value) || 0;
    const wechatAmount = parseFloat(document.getElementById('wechat-amount').value) || 0;
    const alipayAmount = parseFloat(document.getElementById('alipay-amount').value) || 0;
    const cardAmount = parseFloat(document.getElementById('card-amount').value) || 0;
    
    const paymentTotal = cashAmount + wechatAmount + alipayAmount + cardAmount;
    
    // 实收金额等于付款方式的总和
    document.getElementById('actual-amount').value = paymentTotal.toFixed(2);
    
    const discount = receivableTotal - paymentTotal;
    
    document.getElementById('payment-total').textContent = `付款总计: ${paymentTotal}元`;
    document.getElementById('discount-display').textContent = `折扣: ${discount.toFixed(2)}元`;
    document.getElementById('discount-display').style.color = discount >= 0 ? '#27ae60' : '#e74c3c';
}

// 设置付款金额（最大/最小按钮功能）
function setPaymentAmount(inputId, amount) {
    const input = document.getElementById(inputId);
    if (input) {
        // 如果设置为最大金额，先清空其他付款方式
        if (amount > 0) {
            ['cash-amount', 'wechat-amount', 'alipay-amount', 'card-amount'].forEach(id => {
                if (id !== inputId) {
                    const otherInput = document.getElementById(id);
                    if (otherInput) {
                        otherInput.value = '0';
                    }
                }
            });
        }
        
        input.value = amount.toFixed(2);
        
        // 触发input事件来更新计算
        input.dispatchEvent(new Event('input'));
    }
}

// 取消付款
function cancelPayment() {
    const dialog = document.getElementById('payment-dialog');
    if (dialog) {
        dialog.remove();
    }
}

// 确认付款
function confirmPayment(receivableTotal, roomFee, productFee, serviceFee, loans) {
    const actualAmount = parseFloat(document.getElementById('actual-amount').value) || 0;
    const cashAmount = parseFloat(document.getElementById('cash-amount').value) || 0;
    const wechatAmount = parseFloat(document.getElementById('wechat-amount').value) || 0;
    const alipayAmount = parseFloat(document.getElementById('alipay-amount').value) || 0;
    const cardAmount = parseFloat(document.getElementById('card-amount').value) || 0;
    
    const paymentTotal = cashAmount + wechatAmount + alipayAmount + cardAmount;
    const discount = receivableTotal - actualAmount;
    
    // 验证付款金额
    if (Math.abs(paymentTotal - actualAmount) > 0.01) {
        alert(`付款总计(${paymentTotal}元)与实收金额(${actualAmount}元)不匹配！`);
        return;
    }
    
    if (actualAmount <= 0) {
        alert('实收金额必须大于0！');
        return;
    }
    
    // 构建付款方式描述
    const paymentMethods = [];
    if (cashAmount > 0) paymentMethods.push(`现金${cashAmount}元`);
    if (wechatAmount > 0) paymentMethods.push(`微信${wechatAmount}元`);
    if (alipayAmount > 0) paymentMethods.push(`支付宝${alipayAmount}元`);
    if (cardAmount > 0) paymentMethods.push(`银行卡${cardAmount}元`);
    
    const paymentMethodStr = paymentMethods.join(' + ') || '无';
    
    // 确认结账
    const confirmText = `确认结账信息：\n应收: ${receivableTotal}元\n实收: ${actualAmount}元\n折扣: ${discount}元\n付款: ${paymentMethodStr}\n\n确认结账？`;
    
    if (confirm(confirmText)) {
        processCheckout(receivableTotal, actualAmount, discount, {
            cash: cashAmount,
            wechat: wechatAmount,
            alipay: alipayAmount,
            card: cardAmount
        }, paymentMethodStr, roomFee, productFee, serviceFee, loans);
    }
}

// 处理结账
function processCheckout(receivableTotal, actualAmount, discount, paymentAmounts, paymentMethodStr, roomFee, productFee, serviceFee, loans) {
    const room = rooms[currentRoom];
    
    // 记录交易 - 修复日期格式问题
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
                   String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(now.getDate()).padStart(2, '0');
    
    const transaction = {
        date: dateStr,
        time: now.toLocaleTimeString('zh-CN', {timeZone: 'Asia/Shanghai'}),
        operator: currentUser.name,
        room: currentRoom,
        startTime: room.startTime, // 添加开始时间
        roomFee: roomFee,
        products: [...room.products],
        productFee: productFee,
        serviceFee: serviceFee,
        services: room.services ? {...room.services} : {ac: false, heater: false},
        loans: loans,
        loanRecords: [...room.loans], // 保存借款详细记录
        paymentMethod: paymentMethodStr,
        paymentAmounts: paymentAmounts, // 保存详细付款金额
        receivableTotal: receivableTotal, // 应收合计（不含借款）
        actualAmount: actualAmount, // 实际收款
        discount: discount, // 折扣金额
        total: actualAmount, // 实际收入（实收金额）
        duration: document.getElementById('duration').textContent,
        actualDuration: document.getElementById('actual-duration').textContent,
        pausedDuration: document.getElementById('paused-duration').textContent
    };
    
    transactions.push(transaction);
    
    // 关闭付款弹窗
    cancelPayment();
    
    // 重置房间状态
    room.status = 'idle';
    room.startTime = null;
    room.products = [];
    room.loans = [];  // 修改为数组
    room.totalFee = 0;
    room.pausedTime = 0;
    room.pauseStart = null;
    room.isPaused = false;
    room.services = { ac: false, heater: false }; // 重置服务状态
    
    // 停止计时器
    if (roomTimer) {
        clearInterval(roomTimer);
        roomTimer = null;
    }
    
    saveData();
    updateRoomDisplay();
    updateRoomInfo();
    
    alert('结账成功');
    showPage('main-page');
}

// 管理页面相关功能
function showAdminTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    event.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
    
    if (tabId === 'user-management') {
        loadUserManagement();
    }
}

// 加载管理数据
function loadAdminData() {
    loadRoomRates();
    loadProductManagement();
    loadUserManagement();
    loadOperatorFilter();
}

// 加载房间费率设置
function loadRoomRates() {
    // 大厅费率
    document.getElementById('hall-rate').value = rates.hall;
    
    // 包房费率
    const privateRoomRatesDiv = document.getElementById('private-room-rates');
    privateRoomRatesDiv.innerHTML = '';
    
    Object.keys(rates.privateRooms).forEach(roomName => {
        const rateDiv = document.createElement('div');
        rateDiv.className = 'private-room-rate';
        rateDiv.innerHTML = `
            <span>${roomName}</span>
            <div>
                <input type="number" value="${rates.privateRooms[roomName]}" 
                       id="rate-${roomName}" placeholder="费率(元/4小时)">
                <button onclick="updatePrivateRoomRate('${roomName}')">更新</button>
            </div>
        `;
        privateRoomRatesDiv.appendChild(rateDiv);
    });
    
    // 计费设置
    const sessionHours = rates.sessionHours || 4;
    const sessionDisplay = rates.sessionDisplay || '4小时';
    
    // 根据当前设置回填表单
    if (sessionDisplay.includes('秒')) {
        document.getElementById('session-value').value = Math.round(sessionHours * 3600);
        document.getElementById('session-unit').value = 'seconds';
    } else if (sessionDisplay.includes('分钟')) {
        document.getElementById('session-value').value = Math.round(sessionHours * 60);
        document.getElementById('session-unit').value = 'minutes';
    } else {
        document.getElementById('session-value').value = sessionHours;
        document.getElementById('session-unit').value = 'hours';
    }
    
    document.getElementById('current-session-display').textContent = sessionDisplay;
    
    // 其他费率
    document.getElementById('ac-rate').value = rates.ac;
    document.getElementById('heater-rate').value = rates.heater;
    document.getElementById('overnight-rate').value = rates.overnight;
}

// 更新大厅费率
function updateHallRate() {
    const newRate = parseFloat(document.getElementById('hall-rate').value);
    if (!newRate || newRate <= 0) {
        alert('请输入有效费率');
        return;
    }
    
    rates.hall = newRate;
    saveData();
    alert('大厅费率更新成功');
}

// 更新包房费率
function updatePrivateRoomRate(roomName) {
    const newRate = parseFloat(document.getElementById(`rate-${roomName}`).value);
    if (!newRate || newRate <= 0) {
        alert('请输入有效费率');
        return;
    }
    
    // 检查房间是否在使用中
    if (rooms[roomName].status === 'occupied') {
        alert('房间正在使用中，无法修改费率');
        return;
    }
    
    rates.privateRooms[roomName] = newRate;
    saveData();
    alert(`${roomName}费率更新成功`);
}

// 更新一场时长
function updateSessionHours() {
    const sessionValue = parseInt(document.getElementById('session-value').value);
    const sessionUnit = document.getElementById('session-unit').value;
    
    if (!sessionValue || sessionValue <= 0) {
        alert('请输入有效数值');
        return;
    }
    
    // 转换为小时存储
    let sessionHours;
    let displayText;
    
    switch(sessionUnit) {
        case 'seconds':
            if (sessionValue > 86400) { // 最大24小时的秒数
                alert('秒数不能超过86400(24小时)');
                return;
            }
            sessionHours = sessionValue / 3600;
            displayText = `${sessionValue}秒`;
            break;
        case 'minutes':
            if (sessionValue > 1440) { // 最大24小时的分钟数
                alert('分钟数不能超过1440(24小时)');
                return;
            }
            sessionHours = sessionValue / 60;
            displayText = `${sessionValue}分钟`;
            break;
        case 'hours':
            if (sessionValue > 24) {
                alert('小时数不能超过24');
                return;
            }
            sessionHours = sessionValue;
            displayText = `${sessionValue}小时`;
            break;
        default:
            alert('无效的时间单位');
            return;
    }
    
    rates.sessionHours = sessionHours;
    rates.sessionDisplay = displayText; // 保存显示文本
    saveData();
    
    // 更新显示
    document.getElementById('current-session-display').textContent = displayText;
    
    alert(`一场时长更新为${displayText}`);
}

// 更新其他费率
function updateOtherRates() {
    const acRate = parseFloat(document.getElementById('ac-rate').value);
    const heaterRate = parseFloat(document.getElementById('heater-rate').value);
    const overnightRate = parseFloat(document.getElementById('overnight-rate').value);
    
    if (!acRate || acRate <= 0 || !heaterRate || heaterRate <= 0 || !overnightRate || overnightRate <= 0) {
        alert('请输入有效费率');
        return;
    }
    
    rates.ac = acRate;
    rates.heater = heaterRate;
    rates.overnight = overnightRate;
    saveData();
    alert('其他费率更新成功');
}

// 加载商品管理
function loadProductManagement() {
    const listDiv = document.getElementById('product-management-list');
    listDiv.innerHTML = '';
    
    Object.keys(products).forEach(productName => {
        const product = products[productName];
        const productDiv = document.createElement('div');
        productDiv.className = 'product-item';
        productDiv.innerHTML = `
            <div class="product-item-info">
                <strong>${productName}</strong><br>
                价格: ${product.price}元 | 库存: ${product.stock}
            </div>
            <div class="product-item-actions">
                <input type="number" id="price-${productName}" value="${product.price}" placeholder="价格">
                <input type="number" id="stock-${productName}" value="${product.stock}" placeholder="库存">
                <button class="update-btn" onclick="updateProduct('${productName}')">更新</button>
                <button class="delete-btn" onclick="deleteProduct('${productName}')">删除</button>
            </div>
        `;
        listDiv.appendChild(productDiv);
    });
}

// 添加新商品
function addNewProduct() {
    const name = document.getElementById('new-product-name').value.trim();
    const price = parseFloat(document.getElementById('new-product-price').value);
    const stock = parseInt(document.getElementById('new-product-stock').value);
    
    if (!name) {
        alert('请输入商品名称');
        return;
    }
    
    if (!price || price <= 0) {
        alert('请输入有效价格');
        return;
    }
    
    if (!stock || stock < 0) {
        alert('请输入有效库存');
        return;
    }
    
    if (products[name]) {
        alert('商品已存在');
        return;
    }
    
    products[name] = { price: price, stock: stock };
    
    // 清空输入
    document.getElementById('new-product-name').value = '';
    document.getElementById('new-product-price').value = '';
    document.getElementById('new-product-stock').value = '';
    
    saveData();
    loadProducts();
    loadProductManagement();
    alert('商品添加成功');
}

// 更新商品
function updateProduct(productName) {
    const newPrice = parseFloat(document.getElementById(`price-${productName}`).value);
    const newStock = parseInt(document.getElementById(`stock-${productName}`).value);
    
    if (!newPrice || newPrice <= 0) {
        alert('请输入有效价格');
        return;
    }
    
    if (newStock < 0) {
        alert('库存不能为负数');
        return;
    }
    
    products[productName].price = newPrice;
    products[productName].stock = newStock;
    
    saveData();
    loadProducts();
    loadProductManagement();
    alert('商品更新成功');
}

// 删除商品
function deleteProduct(productName) {
    if (confirm(`确认删除商品"${productName}"？`)) {
        delete products[productName];
        saveData();
        loadProducts();
        loadProductManagement();
        alert('商品删除成功');
    }
}

// 报表相关功能
function setDefaultDate() {
    // 使用UTC+8时区的当前日期
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
                   String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(now.getDate()).padStart(2, '0');
    document.getElementById('report-start-date').value = dateStr;
    document.getElementById('report-end-date').value = dateStr;
}


// 生成房间消费报表
function generateRoomReport(dayTransactions) {
    const roomReportDiv = document.getElementById('room-report');
    
    if (dayTransactions.length === 0) {
        roomReportDiv.innerHTML = '<p>当日无房间消费记录</p>';
        return;
    }
    
    let html = '<table class="report-table"><thead><tr><th>房间</th><th>时间</th><th>使用时长</th><th>房费</th></tr></thead><tbody>';
    
    let totalRoomFee = 0;
    dayTransactions.forEach(transaction => {
        html += `<tr>
            <td>${transaction.room}</td>
            <td>${transaction.time}</td>
            <td>${transaction.duration}</td>
            <td>${transaction.roomFee}元</td>
        </tr>`;
        totalRoomFee += transaction.roomFee;
    });
    
    html += `</tbody><tfoot><tr><td colspan="3"><strong>总计</strong></td><td><strong>${totalRoomFee}元</strong></td></tr></tfoot></table>`;
    roomReportDiv.innerHTML = html;
}

// 生成商品消费报表
function generateProductReport(dayTransactions) {
    const productReportDiv = document.getElementById('product-report');
    
    const productSales = {};
    let totalProductFee = 0;
    
    dayTransactions.forEach(transaction => {
        transaction.products.forEach(product => {
            if (!productSales[product.name]) {
                productSales[product.name] = { quantity: 0, total: 0 };
            }
            productSales[product.name].quantity += product.quantity;
            productSales[product.name].total += product.price * product.quantity;
        });
        totalProductFee += transaction.productFee;
    });
    
    if (Object.keys(productSales).length === 0) {
        productReportDiv.innerHTML = '<p>当日无商品消费记录</p>';
        return;
    }
    
    let html = '<table class="report-table"><thead><tr><th>商品名称</th><th>销售数量</th><th>销售金额</th></tr></thead><tbody>';
    
    Object.keys(productSales).forEach(productName => {
        const sales = productSales[productName];
        html += `<tr>
            <td>${productName}</td>
            <td>${sales.quantity}</td>
            <td>${sales.total}元</td>
        </tr>`;
    });
    
    html += `</tbody><tfoot><tr><td colspan="2"><strong>总计</strong></td><td><strong>${totalProductFee}元</strong></td></tr></tfoot></table>`;
    productReportDiv.innerHTML = html;
}

// 生成统计总计报表
function generateTotalReport(dayTransactions) {
    const totalReportDiv = document.getElementById('total-report');
    
    if (dayTransactions.length === 0) {
        totalReportDiv.innerHTML = '<p>当日无交易记录</p>';
        return;
    }
    
    let totalRoomFee = 0;
    let totalProductFee = 0;
    let totalLoans = 0;
    let grandTotal = 0;
    
    dayTransactions.forEach(transaction => {
        totalRoomFee += transaction.roomFee;
        totalProductFee += transaction.productFee;
        totalLoans += transaction.loans;
        grandTotal += transaction.total;
    });
    
    const html = `
        <table class="report-table">
            <tbody>
                <tr><td>房费收入</td><td>${totalRoomFee}元</td></tr>
                <tr><td>商品收入</td><td>${totalProductFee}元</td></tr>
                <tr><td>借款金额</td><td>${totalLoans}元</td></tr>
                <tr><td>交易笔数</td><td>${dayTransactions.length}笔</td></tr>
                <tr class="total"><td><strong>总收入</strong></td><td><strong>${grandTotal}元</strong></td></tr>
            </tbody>
        </table>
    `;
    
    totalReportDiv.innerHTML = html;
}

// 导出每日明细为 CSV（单日导出）
function exportReportCSV() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const selectedOperator = document.getElementById('operator-filter').value;
    
    if (!startDate || !endDate) {
        alert('请选择开始和结束日期');
        return;
    }
    
    if (startDate !== endDate) {
        alert('请使用"下载日期范围表格"按钮导出多日期范围的数据');
        return;
    }

    // 筛选当日交易
    let dayTransactions = transactions.filter(t => t.date === startDate);
    if (selectedOperator) {
        dayTransactions = dayTransactions.filter(t => t.operator === selectedOperator);
    }
    if (dayTransactions.length === 0) {
        const who = selectedOperator ? `（操作员：${selectedOperator}）` : '';
        alert(`当日${who}无交易记录，无法导出`);
        return;
    }

    // 计算与构建“房间消费明细”CSV行
    const roomHeaders = [
        '房间',
        '开始时间',
        '操作员',
        '使用时长',
        '实际时长',
        '房费',
        '服务费',
        '过夜时长',
        '过夜费',
        '商品消费',
        '折扣',
        '实际房间收入',
        '商品明细'
    ];

    const lines = [];

    // 顶部说明
    const filterText = selectedOperator ? `操作员: ${selectedOperator}` : '全部操作员';
    lines.push(csvRow(['报表日期', selectedDate]));
    lines.push(csvRow(['筛选条件', filterText]));
    lines.push(''); // 空行分隔

    // 房间消费明细
    lines.push('房间消费明细');
    lines.push(csvRow(roomHeaders));

    // 统计项
    let totalBasicRoomFee = 0;
    let totalServiceFee = 0;
    let totalOvernightFee = 0;
    let totalProductFee = 0;
    let grandTotal = 0;

    dayTransactions.forEach(tr => {
        // 计算过夜费
        let overnightHours = 0;
        let overnightFee = 0;
        if (tr.startTime) {
            const startTime = new Date(tr.startTime);
            const endTime = new Date(`${tr.date} ${tr.time}`);
            let currentTime = new Date(startTime);
            while (currentTime < endTime) {
                const hour = currentTime.getHours();
                if (hour >= 0 && hour < 8) {
                    overnightHours += 1;
                }
                currentTime.setHours(currentTime.getHours() + 1);
            }
            if (overnightHours > 0) {
                overnightFee = overnightHours * (rates.overnight || 10);
            }
        }
        const overnightDurationStr = `${overnightHours}小时`;

        // 服务费（不含过夜）
        const totalTransactionServiceFee = tr.serviceFee || 0;
        let transactionServiceFee = totalTransactionServiceFee - overnightFee;
        if (transactionServiceFee < 0) transactionServiceFee = 0;

        // 折扣与实际收入
        const receivableTotal = tr.receivableTotal || ((tr.roomFee || 0) + (tr.productFee || 0) + (tr.serviceFee || 0));
        const actualAmount = tr.actualAmount || tr.total || 0;
        const discount = receivableTotal - actualAmount;

        // 商品明细
        const productDetail = (tr.products && tr.products.length > 0)
            ? tr.products.map(p => `${p.name} x${p.quantity} = ${(p.price * p.quantity)}元`).join('; ')
            : '无';

        // 推入明细行
        lines.push(csvRow([
            tr.room || '',
            tr.startTime ? new Date(tr.startTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '',
            tr.operator || '',
            tr.duration || '',
            tr.actualDuration || tr.duration || '',
            money(tr.roomFee),
            money(transactionServiceFee),
            overnightDurationStr,
            money(overnightFee),
            money(tr.productFee),
            money(discount),
            money(actualAmount),
            productDetail
        ]));

        // 累计统计
        totalBasicRoomFee += tr.roomFee || 0;
        totalServiceFee += transactionServiceFee;
        totalOvernightFee += overnightFee;
        totalProductFee += tr.productFee || 0;
        grandTotal += actualAmount;
    });

    // 统计总计部分
    lines.push(''); // 空行分隔
    lines.push('统计总计');
    const totalsTable = [
        ['基础房费', money(totalBasicRoomFee)],
        ['服务费', money(totalServiceFee)],
        ['过夜费', money(totalOvernightFee)],
        ['商品消费', money(totalProductFee)],
        ['交易笔数', String(dayTransactions.length)],
        ['总收入', money(grandTotal)]
    ];
    totalsTable.forEach(row => lines.push(csvRow(row)));

    // 生成并下载 CSV（含 BOM，便于 Excel 正确识别 UTF-8）
    const filename = `每日明细_${selectedDate}${selectedOperator ? '_' + selectedOperator : ''}.csv`;
    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 辅助：金额格式化为保留两位小数的字符串，附加“元”
    function money(n) {
        const v = parseFloat(n || 0);
        return `${v.toFixed(2)}元`;
    }

    // 辅助：CSV 转义并拼接为一行
    function csvRow(arr) {
        return arr.map(csvEscape).join(',');
    }

    function csvEscape(val) {
        const s = (val === undefined || val === null) ? '' : String(val);
        const escaped = s.replace(/"/g, '""');
        // 始终用引号包裹，避免逗号/换行/数字被 Excel 误判
        return `"${escaped}"`;
    }
}

// 导出日期范围表格为 CSV
function exportReportCSVRange() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const selectedOperator = document.getElementById('operator-filter').value;
    
    if (!startDate || !endDate) {
        alert('请选择开始和结束日期');
        return;
    }
    
    if (startDate > endDate) {
        alert('开始日期不能晚于结束日期');
        return;
    }

    // 筛选日期范围内的交易
    let rangeTransactions = transactions.filter(t => t.date >= startDate && t.date <= endDate);
    if (selectedOperator) {
        rangeTransactions = rangeTransactions.filter(t => t.operator === selectedOperator);
    }
    if (rangeTransactions.length === 0) {
        const who = selectedOperator ? `（操作员：${selectedOperator}）` : '';
        alert(`选定日期范围内${who}无交易记录，无法导出`);
        return;
    }

    // CSV头部
    const roomHeaders = [
        '日期',
        '房间',
        '开始时间',
        '操作员',
        '使用时长',
        '实际时长',
        '房费',
        '服务费',
        '过夜时长',
        '过夜费',
        '商品消费',
        '折扣',
        '实际房间收入',
        '商品明细'
    ];

    const lines = [];

    // 顶部说明
    const filterText = selectedOperator ? `操作员: ${selectedOperator}` : '全部操作员';
    lines.push(csvRow(['报表日期范围', `${startDate} 至 ${endDate}`]));
    lines.push(csvRow(['筛选条件', filterText]));
    lines.push(''); // 空行分隔

    // 房间消费明细
    lines.push('房间消费明细');
    lines.push(csvRow(roomHeaders));

    // 统计项
    let totalBasicRoomFee = 0;
    let totalServiceFee = 0;
    let totalOvernightFee = 0;
    let totalProductFee = 0;
    let grandTotal = 0;

    rangeTransactions.forEach(tr => {
        // 计算过夜费
        let overnightHours = 0;
        let overnightFee = 0;
        if (tr.startTime) {
            const startTime = new Date(tr.startTime);
            const endTime = new Date(`${tr.date} ${tr.time}`);
            let currentTime = new Date(startTime);
            while (currentTime < endTime) {
                const hour = currentTime.getHours();
                if (hour >= 0 && hour < 8) {
                    overnightHours += 1;
                }
                currentTime.setHours(currentTime.getHours() + 1);
            }
            if (overnightHours > 0) {
                overnightFee = overnightHours * (rates.overnight || 10);
            }
        }
        const overnightDurationStr = `${overnightHours}小时`;

        // 服务费（不含过夜）
        const totalTransactionServiceFee = tr.serviceFee || 0;
        let transactionServiceFee = totalTransactionServiceFee - overnightFee;
        if (transactionServiceFee < 0) transactionServiceFee = 0;

        // 折扣与实际收入
        const receivableTotal = tr.receivableTotal || ((tr.roomFee || 0) + (tr.productFee || 0) + (tr.serviceFee || 0));
        const actualAmount = tr.actualAmount || tr.total || 0;
        const discount = receivableTotal - actualAmount;

        // 商品明细
        const productDetail = (tr.products && tr.products.length > 0)
            ? tr.products.map(p => `${p.name} x${p.quantity} = ${(p.price * p.quantity)}元`).join('; ')
            : '无';

        // 推入明细行
        lines.push(csvRow([
            tr.date,
            tr.room || '',
            tr.startTime ? new Date(tr.startTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '',
            tr.operator || '',
            tr.duration || '',
            tr.actualDuration || tr.duration || '',
            money(tr.roomFee),
            money(transactionServiceFee),
            overnightDurationStr,
            money(overnightFee),
            money(tr.productFee),
            money(discount),
            money(actualAmount),
            productDetail
        ]));

        // 累计统计
        totalBasicRoomFee += tr.roomFee || 0;
        totalServiceFee += transactionServiceFee;
        totalOvernightFee += overnightFee;
        totalProductFee += tr.productFee || 0;
        grandTotal += actualAmount;
    });

    // 统计总计部分
    lines.push(''); // 空行分隔
    lines.push('统计总计');
    const totalsTable = [
        ['基础房费', money(totalBasicRoomFee)],
        ['服务费', money(totalServiceFee)],
        ['过夜费', money(totalOvernightFee)],
        ['商品消费', money(totalProductFee)],
        ['交易笔数', String(rangeTransactions.length)],
        ['总收入', money(grandTotal)]
    ];
    totalsTable.forEach(row => lines.push(csvRow(row)));

    // 生成并下载 CSV（含 BOM，便于 Excel 正确识别 UTF-8）
    const filename = `茶坊报表_${startDate}_至_${endDate}${selectedOperator ? '_' + selectedOperator : ''}.csv`;
    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 辅助函数
    function money(n) {
        const v = parseFloat(n || 0);
        return `${v.toFixed(2)}元`;
    }

    function csvRow(arr) {
        return arr.map(csvEscape).join(',');
    }

    function csvEscape(val) {
        const s = (val === undefined || val === null) ? '' : String(val);
        const escaped = s.replace(/"/g, '""');
        return `"${escaped}"`;
    }
}

// 检查并创建报表文件夹
function ensureReportsFolder() {
    const fs = require('fs');
    const path = require('path');
    const reportsFolder = path.join(__dirname, '报表文件夹');
    
    if (!fs.existsSync(reportsFolder)) {
        fs.mkdirSync(reportsFolder, { recursive: true });
    }
    
    return reportsFolder;
}

// 自动下载前一天的报表（浏览器兼容版本）
function autoDownloadYesterdayReport() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.getFullYear() + '-' + 
                        String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(yesterday.getDate()).padStart(2, '0');
    
    // 筛选前一天的交易
    const yesterdayTransactions = transactions.filter(t => t.date === yesterdayStr);
    
    if (yesterdayTransactions.length === 0) {
        alert(`前一天(${yesterdayStr})无交易记录，无法生成报表`);
        return;
    }
    
    try {
        // CSV头部
        const roomHeaders = [
            '日期',
            '房间',
            '开始时间',
            '操作员',
            '使用时长',
            '实际时长',
            '房费',
            '服务费',
            '过夜时长',
            '过夜费',
            '商品消费',
            '折扣',
            '实际房间收入',
            '商品明细'
        ];

        const lines = [];

        // 顶部说明
        lines.push(csvRow(['报表日期', yesterdayStr]));
        lines.push(csvRow(['生成时间', new Date().toLocaleString('zh-CN')])); 
        lines.push(csvRow(['类型', '自动下载报表']));
        lines.push(''); // 空行分隔

        // 房间消费明细
        lines.push('房间消费明细');
        lines.push(csvRow(roomHeaders));

        // 统计项
        let totalBasicRoomFee = 0;
        let totalServiceFee = 0;
        let totalOvernightFee = 0;
        let totalProductFee = 0;
        let grandTotal = 0;

        yesterdayTransactions.forEach(tr => {
            // 计算过夜费
            let overnightHours = 0;
            let overnightFee = 0;
            if (tr.startTime) {
                const startTime = new Date(tr.startTime);
                const endTime = new Date(`${tr.date} ${tr.time}`);
                let currentTime = new Date(startTime);
                while (currentTime < endTime) {
                    const hour = currentTime.getHours();
                    if (hour >= 0 && hour < 8) {
                        overnightHours += 1;
                    }
                    currentTime.setHours(currentTime.getHours() + 1);
                }
                if (overnightHours > 0) {
                    overnightFee = overnightHours * (rates.overnight || 10);
                }
            }
            const overnightDurationStr = `${overnightHours}小时`;

            // 服务费（不含过夜）
            const totalTransactionServiceFee = tr.serviceFee || 0;
            let transactionServiceFee = totalTransactionServiceFee - overnightFee;
            if (transactionServiceFee < 0) transactionServiceFee = 0;

            // 折扣与实际收入
            const receivableTotal = tr.receivableTotal || ((tr.roomFee || 0) + (tr.productFee || 0) + (tr.serviceFee || 0));
            const actualAmount = tr.actualAmount || tr.total || 0;
            const discount = receivableTotal - actualAmount;

            // 商品明细
            const productDetail = (tr.products && tr.products.length > 0)
                ? tr.products.map(p => `${p.name} x${p.quantity} = ${(p.price * p.quantity)}元`).join('; ')
                : '无';

            // 推入明细行
            lines.push(csvRow([
                tr.date,
                tr.room || '',
                tr.startTime ? new Date(tr.startTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '',
                tr.operator || '',
                tr.duration || '',
                tr.actualDuration || tr.duration || '',
                money(tr.roomFee),
                money(transactionServiceFee),
                overnightDurationStr,
                money(overnightFee),
                money(tr.productFee),
                money(discount),
                money(actualAmount),
                productDetail
            ]));

            // 累计统计
            totalBasicRoomFee += tr.roomFee || 0;
            totalServiceFee += transactionServiceFee;
            totalOvernightFee += overnightFee;
            totalProductFee += tr.productFee || 0;
            grandTotal += actualAmount;
        });

        // 统计总计部分
        lines.push(''); // 空行分隔
        lines.push('统计总计');
        const totalsTable = [
            ['基础房费', money(totalBasicRoomFee)],
            ['服务费', money(totalServiceFee)],
            ['过夜费', money(totalOvernightFee)],
            ['商品消费', money(totalProductFee)],
            ['交易笔数', String(yesterdayTransactions.length)],
            ['总收入', money(grandTotal)]
        ];
        totalsTable.forEach(row => lines.push(csvRow(row)));

        // 浏览器下载方式
        const filename = `自动报表_${yesterdayStr}.csv`;
        const csvContent = '\uFEFF' + lines.join('\n');
        
        // 创建Blob并下载
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`前一天报表已生成并下载: ${filename}`);
        
        // 辅助函数
        function money(n) {
            const v = parseFloat(n || 0);
            return `${v.toFixed(2)}元`;
        }

        function csvRow(arr) {
            return arr.map(csvEscape).join(',');
        }

        function csvEscape(val) {
            const s = (val === undefined || val === null) ? '' : String(val);
            const escaped = s.replace(/"/g, '""');
            return `"${escaped}"`;
        }
        
    } catch (error) {
        console.error('自动下载前一天报表失败:', error);
        alert('自动下载报表失败: ' + error.message);
    }
}

// 设置定时任务 - 每天早上8点自动下载前一天报表（浏览器版本）
function setupAutoDownload() {
    setInterval(() => {
        const now = new Date();
        // 检查是否是早上8点 (8:00)
        if (now.getHours() === 8 && now.getMinutes() === 0) {
            autoDownloadYesterdayReport();
        }
    }, 60000); // 每分钟检查一次
    
    console.log('自动下载功能已启动，将在每天早上8点自动下载前一天报表');
    alert('自动下载功能已启动，将在每天早上8点自动下载前一天报表');
}

// 初始化脚注动画
function initFooterAnimation() {
    const footer = document.getElementById('page-footer');
    if (!footer) return;
    
    // 添加鼠标悬停效果
    footer.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px) scale(1.05)';
    });
    
    footer.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
    
    // 添加点击效果
    footer.addEventListener('click', function() {
        this.style.transform = 'translateY(-2px) scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'translateY(-2px) scale(1.05)';
        }, 150);
        
        // 添加特殊动画效果（只播放一次）
        this.style.animation = 'none';
        setTimeout(() => {
            this.style.animation = 'sparkle 2s';
        }, 10);
        
        // 2秒后移除动画
        setTimeout(() => {
            this.style.animation = 'none';
        }, 2010);
    });
    
    // 添加随机闪烁效果
    setInterval(() => {
        if (Math.random() > 0.8) {
            footer.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.6), 0 0 20px rgba(118, 75, 162, 0.4)';
            setTimeout(() => {
                footer.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
            }, 1000);
        }
    }, 5000);
}

// 清空报表记录
function clearReports() {
    if (confirm('确认清空所有交易记录？此操作不可恢复！')) {
        transactions = [];
        saveData();
        
        document.getElementById('room-report').innerHTML = '<p>无记录</p>';
        document.getElementById('product-report').innerHTML = '<p>无记录</p>';
        document.getElementById('total-report').innerHTML = '<p>无记录</p>';
        
        alert('记录清空成功');
    }
}

// 用户管理功能
function loadUserManagement() {
    if (currentUser.role !== 'admin') {
        return;
    }
    
    const listDiv = document.getElementById('user-management-list');
    listDiv.innerHTML = '';
    
    // 只显示非管理员用户
    Object.keys(users).forEach(username => {
        const user = users[username];
        
        // 跳过管理员账户，不在列表中显示
        if (user.role === 'admin') {
            return;
        }
        
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.innerHTML = `
            <div class="user-item-info">
                <strong>${user.name}</strong> (${username})<br>
                <span class="user-role ${user.role}">操作员</span>
            </div>
            <div class="user-item-actions">
                <button class="reset-password-btn" onclick="resetUserPassword('${username}')">重置密码</button>
                <button class="delete-user-btn" onclick="deleteUser('${username}')">删除</button>
            </div>
        `;
        listDiv.appendChild(userDiv);
    });
    
    // 如果没有操作员用户，显示提示信息
    if (listDiv.innerHTML === '') {
        listDiv.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">暂无操作员账户</p>';
    }
}

// 添加新用户
function addNewUser() {
    if (currentUser.role !== 'admin') {
        alert('只有管理员可以添加用户');
        return;
    }
    
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value.trim();
    const realname = document.getElementById('new-user-realname').value.trim();
    const role = document.getElementById('new-user-role').value;
    
    if (!username) {
        alert('请输入用户名');
        return;
    }
    
    if (!password) {
        alert('请输入密码');
        return;
    }
    
    if (!realname) {
        alert('请输入真实姓名');
        return;
    }
    
    if (users[username]) {
        alert('用户名已存在');
        return;
    }
    
    users[username] = {
        password: password,
        role: role,
        name: realname
    };
    
    // 清空输入
    document.getElementById('new-username').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('new-user-realname').value = '';
    document.getElementById('new-user-role').value = 'operator';
    
    saveData();
    loadUserManagement();
    loadOperatorFilter();
    alert('用户添加成功');
}

// 重置用户密码
function resetUserPassword(username) {
    if (currentUser.role !== 'admin') {
        alert('只有管理员可以重置密码');
        return;
    }
    
    const newPassword = prompt(`请输入${users[username].name}的新密码:`);
    if (!newPassword) {
        return;
    }
    
    if (newPassword.length < 6) {
        alert('密码长度不能少于6位');
        return;
    }
    
    users[username].password = newPassword;
    saveData();
    alert('密码重置成功');
}

// 删除用户
function deleteUser(username) {
    if (currentUser.role !== 'admin') {
        alert('只有管理员可以删除用户');
        return;
    }
    
    if (username === 'admin') {
        alert('不能删除管理员账户');
        return;
    }
    
    if (confirm(`确认删除用户"${users[username].name}"？`)) {
        delete users[username];
        saveData();
        loadUserManagement();
        loadOperatorFilter();
        alert('用户删除成功');
    }
}

// 加载操作员筛选选项
function loadOperatorFilter() {
    const select = document.getElementById('operator-filter');
    select.innerHTML = '<option value="">所有操作员</option>';
    
    // 获取所有在交易记录中出现过的操作员
    const operators = new Set();
    transactions.forEach(transaction => {
        if (transaction.operator) {
            operators.add(transaction.operator);
        }
    });
    
    operators.forEach(operator => {
        const option = document.createElement('option');
        option.value = operator;
        option.textContent = operator;
        select.appendChild(option);
    });
}

// 生成报表（支持操作员筛选）
function generateReport() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const selectedOperator = document.getElementById('operator-filter').value;
    
    if (!startDate || !endDate) {
        alert('请选择开始和结束日期');
        return;
    }
    
    if (startDate > endDate) {
        alert('开始日期不能晚于结束日期');
        return;
    }
    
    // 筛选日期范围内的交易
    let rangeTransactions = transactions.filter(t => t.date >= startDate && t.date <= endDate);
    
    // 如果选择了特定操作员，进行筛选
    if (selectedOperator) {
        rangeTransactions = rangeTransactions.filter(t => t.operator === selectedOperator);
    }
    
    // 先生成统计总计，确保总计可见；房间明细中的异常不影响总计
    try {
        generateTotalReport(rangeTransactions, selectedOperator);
    } catch (e) {
        console.error('generateTotalReport error:', e);
        const el = document.getElementById('total-report');
        if (el) el.innerHTML = '<p>统计总计计算出错</p>';
    }
    try {
        generateRoomReport(rangeTransactions, selectedOperator);
    } catch (e) {
        console.error('generateRoomReport error:', e);
        const el = document.getElementById('room-report');
        if (el) el.innerHTML = '<p>房间消费明细生成出错</p>';
    }
}

// 生成房间消费报表（支持操作员筛选）
function generateRoomReport(dayTransactions, selectedOperator) {
    const roomReportDiv = document.getElementById('room-report');
    
    if (dayTransactions.length === 0) {
        const filterText = selectedOperator ? `操作员"${selectedOperator}"当日` : '当日';
        roomReportDiv.innerHTML = `<p>${filterText}无房间消费记录</p>`;
        return;
    }
    
    let html = '<table class="report-table room-report-table"><thead><tr><th>房间</th><th>开始时间</th><th>操作员</th><th>使用时长</th><th>实际时长</th><th>房费</th><th>服务费</th><th>过夜时长</th><th>过夜费</th><th>商品消费</th><th>折扣</th><th>实际房间收入</th></tr></thead><tbody>';
    
    let totalRoomFee = 0;
    let totalServiceFee = 0;
    let totalOvernightFee = 0;
    let totalProductFee = 0;
    let totalDiscount = 0;
    let totalActualRoomIncome = 0;
    
    dayTransactions.forEach((transaction, index) => {
        // 计算过夜费和过夜时长
        const startTime = transaction.startTime ? new Date(transaction.startTime) : null;
        const endTime = new Date(`${transaction.date} ${transaction.time}`);
        let overnightHours = 0;
        let overnightFee = 0;
        
        if (startTime) {
            // 计算过夜小时数
            let currentTime = new Date(startTime);
            while (currentTime < endTime) {
                const hour = currentTime.getHours();
                if (hour >= 0 && hour < 8) {
                    overnightHours += 1;
                }
                currentTime.setHours(currentTime.getHours() + 1);
            }
            
            if (overnightHours > 0) {
                overnightFee = overnightHours * (rates.overnight || 10);
            }
        }
        
        // 服务费只包含空调和烤火，不包含过夜费
        const totalTransactionServiceFee = transaction.serviceFee || 0;
        let transactionServiceFee = totalTransactionServiceFee - overnightFee;
        if (transactionServiceFee < 0) transactionServiceFee = 0; // 防止负数
        
        // 计算折扣和实际房间收入
        const receivableTotal = transaction.receivableTotal || (transaction.roomFee + transaction.productFee + (transaction.serviceFee || 0));
        const actualAmount = transaction.actualAmount || transaction.total || 0;
        const discount = receivableTotal - actualAmount;
        
        // 实际房间收入 = 实际收款金额
        const actualRoomIncome = actualAmount;
        
        const overnightDurationStr = overnightHours > 0 ? `${overnightHours}小时` : '0小时';
        
        // 生成商品消费下拉菜单的内容
        let productDropdownContent = '';
        if (transaction.products && transaction.products.length > 0) {
            productDropdownContent = transaction.products.map(product => 
                `${product.name} x${product.quantity} = ${(product.price * product.quantity)}元`
            ).join('<br>');
        } else {
            productDropdownContent = '无商品消费';
        }
        
        // 商品消费图标，如果有商品则显示可点击的图标
        const hasProducts = transaction.products && transaction.products.length > 0;
        const productIcon = hasProducts ? 
            `<span class="product-dropdown-icon" onclick="toggleProductDropdown('product-${index}')" title="点击查看商品明细">📋</span>` :
            '<span class="no-products-icon" title="无商品消费">-</span>';
        
        html += `<tr>
            <td>${transaction.room} ${productIcon}</td>
            <td>${new Date(transaction.startTime || Date.now()).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}</td>
            <td>${transaction.operator || '未知'}</td>
            <td>${transaction.duration}</td>
            <td>${transaction.actualDuration || transaction.duration}</td>
            <td>${transaction.roomFee}元</td>
            <td>${transactionServiceFee.toFixed(2)}元</td>
            <td>${overnightDurationStr}</td>
            <td>${overnightFee}元</td>
            <td>${transaction.productFee}元</td>
            <td>${discount.toFixed(2)}元</td>
            <td>${actualRoomIncome.toFixed(2)}元</td>
        </tr>`;
        
        // 添加隐藏的商品明细行
        if (hasProducts) {
            html += `<tr id="product-${index}" class="product-detail-row" style="display: none;">
                <td colspan="12" class="product-detail-content">
                    <div class="product-detail-box">
                        <strong>商品消费明细：</strong><br>
                        ${productDropdownContent}
                    </div>
                </td>
            </tr>`;
        }
        
        totalRoomFee += transaction.roomFee;
        totalServiceFee += transactionServiceFee;
        totalOvernightFee += overnightFee;
        totalProductFee += transaction.productFee;
        totalDiscount += discount;
        totalActualRoomIncome += actualRoomIncome;
    });
    
    html += `</tbody><tfoot><tr><td colspan="5"><strong>总计</strong></td><td><strong>${totalRoomFee}元</strong></td><td><strong>${totalServiceFee.toFixed(2)}元</strong></td><td><strong>-</strong></td><td><strong>${totalOvernightFee}元</strong></td><td><strong>${totalProductFee}元</strong></td><td><strong>${totalDiscount.toFixed(2)}元</strong></td><td><strong>${totalActualRoomIncome.toFixed(2)}元</strong></td></tr></tfoot></table>`;
    roomReportDiv.innerHTML = html;
}

// 切换商品明细下拉显示
function toggleProductDropdown(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    }
}

// 生成商品消费报表（支持操作员筛选）
function generateProductReport(dayTransactions, selectedOperator) {
    const productReportDiv = document.getElementById('product-report');
    
    // 创建详细的商品消费记录数组，包含房间信息
    const productDetails = [];
    let totalProductFee = 0;
    
    dayTransactions.forEach(transaction => {
        transaction.products.forEach(product => {
            productDetails.push({
                room: transaction.room,
                time: transaction.time,
                operator: transaction.operator || '未知',
                name: product.name,
                quantity: product.quantity,
                price: product.price,
                total: product.price * product.quantity,
                paymentMethod: transaction.paymentMethod || '未知'
            });
        });
        totalProductFee += transaction.productFee;
    });
    
    if (productDetails.length === 0) {
        const filterText = selectedOperator ? `操作员"${selectedOperator}"当日` : '当日';
        productReportDiv.innerHTML = `<p>${filterText}无商品消费记录</p>`;
        return;
    }
    
    let html = '<table class="report-table"><thead><tr><th>房间</th><th>时间</th><th>商品名称</th><th>数量</th><th>单价</th><th>金额</th><th>付款方式</th></tr></thead><tbody>';
    
    productDetails.forEach(item => {
        html += `<tr>
            <td>${item.room}</td>
            <td>${item.time}</td>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.price}元</td>
            <td>${item.total}元</td>
            <td>${item.paymentMethod}</td>
        </tr>`;
    });
    
    html += `</tbody><tfoot><tr><td colspan="6"><strong>总计</strong></td><td><strong>${totalProductFee}元</strong></td></tr></tfoot></table>`;
    productReportDiv.innerHTML = html;
}

// 生成统计总计报表（支持操作员筛选）
function generateTotalReport(dayTransactions, selectedOperator) {
    const totalReportDiv = document.getElementById('total-report');
    
    if (dayTransactions.length === 0) {
        const filterText = selectedOperator ? `操作员"${selectedOperator}"当日` : '当日';
        totalReportDiv.innerHTML = `<p>${filterText}无交易记录</p>`;
        return;
    }
    
    let totalBasicRoomFee = 0;  // 基础房费
    let totalServiceFee = 0;   // 服务费（不含过夜费）
    let totalOvernightFee = 0; // 过夜费
    let totalProductFee = 0;   // 商品消费
    let grandTotal = 0;        // 总收入
    
    dayTransactions.forEach(transaction => {
        // 基础房费
        totalBasicRoomFee += transaction.roomFee || 0;
        
        // 商品消费
        totalProductFee += transaction.productFee || 0;
        
        // 总收入 - 使用实际收款金额
        grandTotal += transaction.actualAmount || transaction.total || 0;
        
        // 计算过夜费
        let overnightFee = 0;
        if (transaction.startTime) {
            const startTime = new Date(transaction.startTime);
            const endTime = new Date(`${transaction.date} ${transaction.time}`);
            let overnightHours = 0;
            
            let currentTime = new Date(startTime);
            while (currentTime < endTime) {
                const hour = currentTime.getHours();
                if (hour >= 0 && hour < 8) {
                    overnightHours += 1;
                }
                currentTime.setHours(currentTime.getHours() + 1);
            }
            
            if (overnightHours > 0) {
                overnightFee = overnightHours * (rates.overnight || 10);
            }
        }
        
        totalOvernightFee += overnightFee;
        
        // 服务费（总服务费减去过夜费）
        const totalTransactionServiceFee = transaction.serviceFee || 0;
        let transactionServiceFee = totalTransactionServiceFee - overnightFee;
        if (transactionServiceFee < 0) transactionServiceFee = 0;
        totalServiceFee += transactionServiceFee;
    });
    
    const filterText = selectedOperator ? `操作员: ${selectedOperator}` : '全部操作员';
    
    const html = `
        <table class="report-table">
            <tbody>
                <tr><td>筛选条件</td><td>${filterText}</td></tr>
                <tr><td>基础房费</td><td>${totalBasicRoomFee.toFixed(2)}元</td></tr>
                <tr><td>服务费</td><td>${totalServiceFee.toFixed(2)}元</td></tr>
                <tr><td>过夜费</td><td>${totalOvernightFee.toFixed(2)}元</td></tr>
                <tr><td>商品消费</td><td>${totalProductFee.toFixed(2)}元</td></tr>
                <tr><td>交易笔数</td><td>${dayTransactions.length}笔</td></tr>
                <tr class="total"><td><strong>总收入</strong></td><td><strong>${grandTotal.toFixed(2)}元</strong></td></tr>
            </tbody>
        </table>
    `;
    
    totalReportDiv.innerHTML = html;
}
