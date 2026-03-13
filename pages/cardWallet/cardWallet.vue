<template>
    <view class="wallet-container">
        <view class="night-sky">
            <view class="stars stars-slow"></view>
            <view class="stars stars-fast"></view>
        </view>

        <view class="header">
            <text class="title">🎟️ 宝宝的专属卡包</text>
            <text class="subtitle">随时随地，行使你的终极特权</text>
            <view class="history-btn" @tap="showHistory">📜 本周记录</view>
        </view>

        <scroll-view class="ticket-list" scroll-y="true">
            <block v-for="(item, index) in tickets" :key="index">
                <view class="ticket-card" :style="'background: ' + item.bgGradiant + ';'">
                    
                    <view class="ticket-badge">余量: {{ item.count || 0 }}</view>
                    
                    <view class="ticket-left" @longpress="onIconLongPress(index)">
                        <text class="ticket-icon">{{ item.icon }}</text>
                    </view>

                    <view class="ticket-divider"></view>

                    <view class="ticket-right">
                        <text class="ticket-name">{{ item.name }}</text>
                        <text class="ticket-desc">{{ item.desc }}</text>
                        <view class="use-btn" @tap="openUseModal(index)">立即使用</view>
                    </view>

                </view>
            </block>
            <view style="height: 60rpx;"></view>
        </scroll-view>

        <view class="modal-mask" v-if="showUseModal" @tap="closeUseModal">
            <view class="history-box use-box" @tap.stop.prevent="stopBubble">
                <text class="modal-title">✨ 发射特权指令</text>
                <text class="use-hint">确定要消耗 1 张【{{ tickets[currentUseIndex].name }}】吗？</text>

                <view class="notify-section">
                    <text class="n-title">呼叫你的星空羁绊 (可选)：</text>
                    
                    <scroll-view class="f-list" scroll-y="true" v-if="friendList.length > 0">
                        <view 
                            class="f-item" 
                            v-for="(f, i) in friendList" 
                            :key="i"
                            :class="{'f-active': selectedFriendId === f.friendId}"
                            @tap="selectFriend(f.friendId)"
                        >
                            <text class="f-icon">🤝</text>
                            <text class="f-id">ID: {{ f.friendId }}</text>
                            <text class="f-check" v-if="selectedFriendId === f.friendId">✅</text>
                        </view>
                    </scroll-view>
                    
                    <view class="f-empty" v-else>
                        <text>你还没有建立星空羁绊，指令只能默默生效喔~</text>
                    </view>
                </view>

                <view class="btn-row">
                    <button class="m-btn cancel" @tap="closeUseModal">再留一下</button>
                    <button class="m-btn confirm" @tap="confirmUseTicket">立刻发射</button>
                </view>
            </view>
        </view>

        <view class="modal-mask" v-if="showHistoryModal" @tap="hideHistory">
            <view class="history-box" @tap.stop.prevent="stopBubble">
                <text class="modal-title">📜 最近一周使用记录</text>
                <scroll-view class="history-list" scroll-y="true">
                    <block v-if="historyList.length > 0">
                        <view class="history-item" v-for="(item, index) in historyList" :key="index">
                            <text class="h-time">{{ item.formatTime }}</text>
                            <text class="h-desc">
                                使用了 1 张 <text class="h-highlight">【{{ item.ticketName }}】</text>
                            </text>
                        </view>
                    </block>
                    <block v-else>
                        <text class="empty-hint">本周还没有使用过特权券喔~</text>
                    </block>
                </scroll-view>
                <view class="close-btn" @tap="hideHistory">关闭账单</view>
            </view>
        </view>

        <view class="modal-mask" v-if="showAdminModal" @tap="closeAdminModal">
            <view class="history-box admin-box" @tap.stop.prevent="stopBubble">
                <text class="modal-title">✨ 店长专属充值通道</text>
                <view class="input-group">
                    <text class="label">最高权限口令</text>
                    <input class="glass-input" :password="true" placeholder="请输入星空口令" v-model="adminSecret" />
                </view>
                <view class="input-group">
                    <text class="label">充值数量</text>
                    <input class="glass-input" type="number" placeholder="请输入需要增加的张数" v-model="adminAddCount" />
                </view>
                <button class="add-btn" @tap="confirmAdminAdd">注入特权能量</button>
            </view>
        </view>

    </view>
</template>

<script>
const db = uniCloud.database();

export default {
    data() {
        return {
            myId: '', // 我的专属ID
            tickets: [
                { name: '奶茶券', desc: '凭此券可随时召唤小华子点一杯全糖加冰的甜甜奶茶！', icon: '🧋', bgGradiant: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)', count: 0 },
                { name: '蛋糕券', desc: '心情不好？想吃甜点？一张蛋糕券立刻治愈不开心！', icon: '🍰', bgGradiant: 'linear-gradient(135deg, #F6D365 0%, #FDA085 100%)', count: 0 },
                { name: '陪玩券', desc: '要求小华子立刻放下手中的一切代码和工作，专心陪宝宝玩！', icon: '🎮', bgGradiant: 'linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%)', count: 0 },
                { name: '催更券', desc: '故事听完了？使用此券，作者必须连夜爆肝更新故事！', icon: '✍️', bgGradiant: 'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)', count: 0 },
                { name: '过来一起学习券', desc: '召唤一只小华子立刻瞬移过来，安安静静陪宝宝自习。', icon: '📚', bgGradiant: 'linear-gradient(135deg, #89F7FE 0%, #66A6FF 100%)', count: 0 },
                { name: '约会券', desc: '凭此券可兑换一次精心准备的浪漫约会，地点宝宝定！', icon: '🌹', bgGradiant: 'linear-gradient(135deg, #FF0844 0%, #FFB199 100%)', count: 0 }
            ],
            
            // 魔法弹窗相关
            showUseModal: false,
            currentUseIndex: 0,
            friendList: [],
            selectedFriendId: '',

            // 历史账单与充值
            historyList: [],
            showHistoryModal: false,
            showAdminModal: false,
            adminSecret: '',
            adminAddCount: '',
            currentEditTicketIndex: -1
        };
    },
    onShow() {
        const currentUser = uni.getStorageSync('currentUser');
        if (currentUser && currentUser._id) {
            this.myId = currentUser._id;
            this.fetchFriends(); // 拉取好友列表供弹窗使用
        }
        this.fetchTicketCounts();
    },
    methods: {
        // 获取余量
        async fetchTicketCounts() {
            try {
                const res = await db.collection('ticket_wallet').get();
                const resData = (res.result && res.result.data) ? res.result.data : (res.data || []);
                const countsMap = {};
                resData.forEach((item) => { countsMap[item.name] = item; });
                this.tickets = this.tickets.map((t) => {
                    return {
                        ...t,
                        count: countsMap[t.name] ? countsMap[t.name].count : 0,
                        dbId: countsMap[t.name] ? countsMap[t.name]._id : null
                    };
                });
            } catch (err) { console.error('拉取余量失败:', err); }
        },

        // 拉取好友列表
        async fetchFriends() {
            try {
                const res = await db.collection('star_friends').where({ userId: this.myId }).get();
                this.friendList = (res.result && res.result.data) ? res.result.data : (res.data || []);
            } catch (err) { console.error('获取好友失败', err); }
        },

        // ==========================================
        // 🎫 全新的点击使用逻辑
        // ==========================================
        openUseModal(index) {
            const ticket = this.tickets[index];
            if (ticket.count <= 0) {
                return uni.showToast({ title: '余量不足，快去撒娇充值！', icon: 'none' });
            }
            this.currentUseIndex = index;
            // 默认自动选中列表里的第一个好友（如果只有小华子的话就更方便了）
            if (this.friendList.length > 0) {
                this.selectedFriendId = this.friendList[0].friendId;
            } else {
                this.selectedFriendId = '';
            }
            this.showUseModal = true;
        },

        closeUseModal() {
            this.showUseModal = false;
        },

        selectFriend(fid) {
            // 点击切换选中状态，再次点击取消选中
            this.selectedFriendId = (this.selectedFriendId === fid) ? '' : fid;
        },

        async confirmUseTicket() {
                    const ticket = this.tickets[this.currentUseIndex];
                    this.showUseModal = false;
                    uni.showLoading({ title: '魔法指令发射中...' });
        
                    try {
                        // 1. 扣除数量
                        if (ticket.dbId) {
                            await db.collection('ticket_wallet').doc(ticket.dbId).update({ count: ticket.count - 1 });
                        }
        
                        // 2. 写历史账单
                        await db.collection('ticket_history').add({ ticketName: ticket.name, createTime: Date.now() });
        
                        // 3. 🚨 核心：如果勾选了好友，把通知写进云端信箱，并且【触发手机弹窗】！
                        if (this.selectedFriendId) {
                            // 写进大厅小铃铛的信箱
                            await db.collection('star_notifications').add({
                                senderId: this.myId,
                                receiverId: this.selectedFriendId,
                                ticketName: ticket.name,
                                content: `报告！宝宝刚刚对你使用了一张【${ticket.name}】，请立刻放下手头的工作去执行！`,
                                isRead: false,
                                createTime: Date.now()
                            });
        
                            // 🌟 🚀 呼叫云函数，触发对方手机的震动弹窗通知！
                            uniCloud.callFunction({
                                name: 'send-ticket-push',
                                data: {
                                    receiverId: this.selectedFriendId,
                                    ticketName: ticket.name
                                }
                            }).then(res => console.log('弹窗指令发射完毕:', res)).catch(err => console.error('弹窗发射失败:', err));
                        }
                        
                        uni.hideLoading();
                        uni.showToast({ title: '指令已下达！', icon: 'success' });
                        this.fetchTicketCounts();
        
                    } catch (err) {
                        uni.hideLoading();
                        uni.showToast({ title: '网络开小差啦', icon: 'error' });
                    }
                },

        // ==========================================
        // 店长充值与其他逻辑保持不变
        // ==========================================
        onIconLongPress(index) {
            this.currentEditTicketIndex = index;
            this.adminSecret = '';
            this.adminAddCount = '';
            this.showAdminModal = true;
            uni.vibrateShort(); 
        },
        closeAdminModal() { this.showAdminModal = false; },
        async confirmAdminAdd() {
            if (this.adminSecret !== '01010505') return uni.showToast({ title: '口令错误！', icon: 'none' });
            const addNum = parseInt(this.adminAddCount);
            if (isNaN(addNum) || addNum <= 0) return uni.showToast({ title: '数量错误', icon: 'none' });
            uni.showLoading({ title: '充值中...' });
            const ticket = this.tickets[this.currentEditTicketIndex];
            const newTotal = ticket.count + addNum;
            try {
                if (ticket.dbId) {
                    await db.collection('ticket_wallet').doc(ticket.dbId).update({ count: newTotal });
                } else {
                    await db.collection('ticket_wallet').add({ name: ticket.name, count: newTotal });
                }
                uni.hideLoading();
                uni.showToast({ title: '充值成功！', icon: 'success' });
                this.showAdminModal = false;
                this.fetchTicketCounts();
            } catch (err) {
                uni.hideLoading();
                uni.showToast({ title: '充值失败', icon: 'none' });
            }
        },
        showHistory() { this.showHistoryModal = true; this.fetchHistory(); },
        hideHistory() { this.showHistoryModal = false; },
        stopBubble() { return; },
        async fetchHistory() {
            const _ = db.command;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            uni.showLoading({ title: '翻阅中...' });
            try {
                const res = await db.collection('ticket_history').where({ createTime: _.gte(sevenDaysAgo.getTime()) }).orderBy('createTime', 'desc').get();
                const resData = (res.result && res.result.data) ? res.result.data : (res.data || []);
                this.historyList = resData.map((item) => {
                    const d = new Date(item.createTime);
                    return { ...item, formatTime: `${d.getMonth()+1}月${d.getDate()}日 ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}` };
                });
                uni.hideLoading();
            } catch (err) { uni.hideLoading(); }
        }
    }
};
</script>

<style>
/* 保持原有样式不变 */
page { height: 100%; background-color: #040710; overflow: hidden; }
.wallet-container { width: 100vw; height: 100vh; position: relative; display: flex; flex-direction: column; align-items: center; }

/* 星空背景 */
.night-sky { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; background: radial-gradient(circle at center, #0a1128 0%, #000000 100%); }
.stars { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.stars-slow { background-image: repeating-radial-gradient(white, rgba(255,255,255,0.2) 1rpx, transparent 2rpx, transparent 100rpx); background-size: 500rpx 500rpx; opacity: 0.3; animation: starsMove 200s linear infinite; }
.stars-fast { background-image: repeating-radial-gradient(white, rgba(255,255,255,0.3) 2rpx, transparent 3rpx, transparent 150rpx); background-size: 400rpx 400rpx; opacity: 0.6; animation: starsMove 120s linear infinite; }
@keyframes starsMove { from { background-position: 0 0; } to { background-position: 1000rpx 1000rpx; } }

/* 头部样式 */
.header { margin-top: 60rpx; margin-bottom: 40rpx; text-align: center; position: relative; width: 100%; }
.title { font-size: 44rpx; font-weight: bold; color: #fff; text-shadow: 0 0 15rpx rgba(255,176,32,0.6); display: block; margin-bottom: 10rpx; }
.subtitle { font-size: 26rpx; color: #FFDAB9; font-weight: bold; }
.history-btn { position: absolute; right: 40rpx; top: 10rpx; font-size: 24rpx; color: rgba(255, 255, 255, 0.9); background: rgba(255, 255, 255, 0.2); padding: 8rpx 20rpx; border-radius: 30rpx; border: 2rpx solid rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px); }
.history-btn:active { transform: scale(0.95); }

/* 卡包列表 */
.ticket-list { width: 90%; flex: 1; height: 0; }
.ticket-card { width: 100%; height: 220rpx; margin-bottom: 35rpx; border-radius: 24rpx; display: flex; box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.4); position: relative; overflow: hidden; }
.ticket-badge { position: absolute; top: 0; left: 0; background: rgba(0, 0, 0, 0.3); color: #fff; font-size: 22rpx; font-weight: bold; padding: 8rpx 20rpx; border-bottom-right-radius: 20rpx; z-index: 10; backdrop-filter: blur(5px); }
.ticket-left { width: 200rpx; display: flex; justify-content: center; align-items: center; background: rgba(255, 255, 255, 0.1); }
.ticket-left:active { opacity: 0.8; }
.ticket-icon { font-size: 80rpx; text-shadow: 0 4rpx 10rpx rgba(0,0,0,0.3); }
.ticket-divider { width: 0; border-left: 4rpx dashed rgba(255, 255, 255, 0.4); position: relative; }
.ticket-divider::before, .ticket-divider::after { content: ''; position: absolute; left: -15rpx; width: 30rpx; height: 30rpx; border-radius: 50%; background-color: #040710; box-shadow: inset 0 2rpx 5rpx rgba(0,0,0,0.5); }
.ticket-divider::before { top: -15rpx; }
.ticket-divider::after { bottom: -15rpx; }
.ticket-right { flex: 1; padding: 30rpx; display: flex; flex-direction: column; justify-content: center; position: relative; }
.ticket-name { font-size: 36rpx; font-weight: bold; color: #fff; margin-bottom: 10rpx; text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.3); }
.ticket-desc { font-size: 24rpx; color: rgba(255,255,255,0.8); line-height: 1.4; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.use-btn { position: absolute; right: 30rpx; bottom: 30rpx; background: rgba(255, 255, 255, 0.9); color: #333; font-size: 24rpx; font-weight: bold; padding: 10rpx 26rpx; border-radius: 30rpx; box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.2); }
.use-btn:active { transform: scale(0.95); }

/* ====== 弹窗通用样式 ====== */
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(10px); z-index: 999; display: flex; justify-content: center; align-items: center; }
.history-box { width: 620rpx; height: 750rpx; background: rgba(30, 41, 59, 0.95); border: 2rpx solid rgba(255, 255, 255, 0.1); border-radius: 30rpx; display: flex; flex-direction: column; padding: 40rpx; box-sizing: border-box; box-shadow: 0 20rpx 50rpx rgba(0,0,0,0.5); }
.modal-title { font-size: 36rpx; color: #FFB020; font-weight: bold; text-align: center; margin-bottom: 20rpx; }
.close-btn { width: 100%; height: 80rpx; background: linear-gradient(135deg, #FFB020 0%, #FF6B6B 100%); border-radius: 40rpx; color: #fff; font-size: 30rpx; font-weight: bold; display: flex; justify-content: center; align-items: center; margin-top: auto;}
.close-btn:active { opacity: 0.8; }

/* 🌟 新增：定制使用弹窗专有样式 */
.use-box { height: auto; min-height: 600rpx; }
.use-hint { text-align: center; color: #fff; font-size: 30rpx; margin-bottom: 40rpx; }
.notify-section { background: rgba(0,0,0,0.2); border-radius: 20rpx; padding: 20rpx; margin-bottom: 40rpx; border: 2rpx dashed rgba(255,255,255,0.2); }
.n-title { font-size: 24rpx; color: #FFDAB9; margin-bottom: 20rpx; display: block; }
.f-list { max-height: 250rpx; }
.f-item { display: flex; align-items: center; padding: 16rpx; background: rgba(255,255,255,0.05); border-radius: 12rpx; margin-bottom: 10rpx; border: 2rpx solid transparent; transition: all 0.2s; }
.f-active { background: rgba(255, 176, 32, 0.15); border-color: #FFB020; }
.f-icon { font-size: 40rpx; margin-right: 15rpx; }
.f-id { color: #fff; font-size: 24rpx; flex: 1; font-family: monospace; }
.f-check { font-size: 28rpx; }
.f-empty { color: rgba(255,255,255,0.4); font-size: 24rpx; text-align: center; padding: 20rpx 0; }

/* 按钮行 */
.btn-row { display: flex; justify-content: space-between; margin-top: auto; }
.m-btn { width: 46%; height: 80rpx; border-radius: 40rpx; font-size: 28rpx; font-weight: bold; display: flex; justify-content: center; align-items: center; border: none; }
.m-btn.cancel { background: rgba(255,255,255,0.1); color: #fff; border: 2rpx solid rgba(255,255,255,0.3); }
.m-btn.confirm { background: linear-gradient(135deg, #FFB020 0%, #FF6B6B 100%); color: #fff; }
.m-btn:active { transform: scale(0.95); }

/* 原有充值、账单杂项 */
.history-list { flex: 1; height: 0; margin-bottom: 30rpx; }
.history-item { background: rgba(255, 255, 255, 0.05); border-radius: 16rpx; padding: 20rpx; margin-bottom: 20rpx; display: flex; flex-direction: column; }
.h-time { font-size: 22rpx; color: rgba(255,255,255,0.4); margin-bottom: 10rpx; }
.h-desc { font-size: 26rpx; color: #fff; }
.h-highlight { color: #FFDAB9; font-weight: bold; }
.empty-hint { display: block; text-align: center; color: rgba(255,255,255,0.4); font-size: 28rpx; margin-top: 100rpx; }
.admin-box { height: auto; min-height: 500rpx; padding-bottom: 50rpx; }
.input-group { width: 100%; margin-bottom: 30rpx; display: flex; flex-direction: column; }
.label { font-size: 26rpx; color: #FFDAB9; margin-bottom: 15rpx; font-weight: bold; }
.glass-input { width: 100%; height: 80rpx; background: rgba(0,0,0,0.3); border-radius: 20rpx; padding: 0 30rpx; color: #fff; font-size: 28rpx; border: 2rpx solid rgba(255,255,255,0.1); box-sizing: border-box;}
.add-btn { width: 100%; height: 80rpx; background: linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%); border-radius: 40rpx; color: #333; font-size: 30rpx; font-weight: bold; display: flex; justify-content: center; align-items: center; margin-top: 20rpx; }
</style>