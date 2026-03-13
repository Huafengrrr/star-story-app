<template>
    <view class="container">
        <view class="header">
            <text class="title" @longpress="openSecretDoor">📖 星空故事屋</text>
        </view>

        <view class="night-sky">
            <view class="stars stars-slow"></view>
            <view class="stars stars-fast"></view>
            <view class="meteors">
                <view class="meteor m1"></view>
                <view class="meteor m2"></view>
                <view class="meteor m3"></view>
            </view>
        </view>

        <view class="content-area">
            
            <view class="header-profile-row">
                <view class="user-profile-btn" @tap="goToProfile">
                    <text class="mini-avatar-emoji">{{ userProfile.avatarUrl || '👽' }}</text>
                </view>

                <view class="noti-bell-btn" v-if="myId" @tap="openNotiModal">
                    <text class="bell-icon">🔔</text>
                    <text class="bell-badge" v-if="unreadNotiCount > 0">{{ unreadNotiCount > 99 ? '99+' : unreadNotiCount }}</text>
                </view>
            </view>
            
            <view class="search-bar">
                <icon class="search-icon" type="search" size="18" color="rgba(255,255,255,0.6)"></icon>
                <input
                    class="search-input"
                    placeholder="在星空中寻找故事..."
                    placeholder-style="color: rgba(255,255,255,0.4);"
                    @input="onSearchInput"
                    @confirm="onSearchConfirm"
                    :value="searchKeyword"
                    confirm-type="search"
                />
                <view class="clear-icon" v-if="searchKeyword" @tap="clearSearch">×</view>
            </view>

            <view class="story-list">
                <block v-for="(item, index) in storyList" :key="index">
                    <view class="story-card" @tap="goToDetail" @longpress="deleteStory" :data-id="item.id" :data-realid="item._id" :data-title="item.title">
                        <image class="story-cover" :src="item.cover" mode="aspectFill"></image>
                        <view class="story-info">
                            <text class="story-title">{{ item.title }}</text>
                        </view>
                    </view>
                </block>
            </view>

            <view class="pagination">
                <button class="page-btn" @tap="prevPage" :disabled="currentPage === 1">上一页</button>
                <text class="page-num">{{ currentPage }} / {{ totalPages }}</text>
                <button class="page-btn" @tap="nextPage" :disabled="currentPage === totalPages">下一页</button>
            </view>
        </view>

        <view class="fab-btn-left" @tap="goToCoffee">
            <text class="fab-icon">☕</text>
        </view>


        <view class="modal-mask" v-if="showNotiModal" @tap="closeNotiModal">
            <view class="modal-box noti-box" @tap.stop.prevent="stopBubble">
                <text class="modal-title">💌 羁绊未读电波</text>
                
                <scroll-view class="noti-scroll-list" scroll-y="true">
                    <block v-if="notificationList.length > 0">
                        <view class="noti-item" v-for="(item, index) in notificationList" :key="index">
                            <view class="n-item-header">
                                <text class="n-icon">⚡</text>
                                <text class="n-time">{{ item.formatTime }}</text>
                            </view>
                            <text class="n-content">{{ item.content }}</text>
                        </view>
                    </block>
                    <block v-else>
                        <text class="empty-noti-text">信号良好，暂无羁绊传来新的电波喔~</text>
                    </block>
                </scroll-view>

                <view class="close-modal-btn" @tap="closeNotiModal">关闭信箱 (标记已读)</view>
            </view>
        </view>
        <view class="modal-mask" v-if="showSecretModal">
            <view class="modal-box">
                <text class="modal-title">📡 店长专属星空雷达</text>
                <text class="modal-subtitle">嘘... 只有小华子能看的数据密室</text>
                <input class="modal-input" :password="true" placeholder="输入星空密码" placeholder-style="color: rgba(255,255,255,0.4);" @input="onSecretPasswordInput" :value="secretPassword" />
                <view class="modal-btns">
                    <view class="m-btn cancel" @tap="hideSecretModal">悄悄离开</view>
                    <view class="m-btn confirm" @tap="verifySecretPassword">开启雷达</view>
                </view>
            </view>
        </view>

    </view>
</template>

<script>
const db = uniCloud.database();
const PAGE_SIZE = 6;

export default {
    data() {
        return {
            userProfile: {},
            myId: '', // 存储我的ID
            storyList: [],
            currentPage: 1,
            totalPages: 1,
            searchKeyword: '',
            
            // 店长雷达相关
            showSecretModal: false,
            secretPassword: '',
            
            // 🌟 🔴 羁绊通知信箱相关
            showNotiModal: false,
            notificationList: [],
            unreadNotiCount: 0
        };
    },
    onLoad() {
        uni.setNavigationBarTitle({ title: '小华子的故事屋' });
    },
    onShow() {
        // ==========================================
        // 👮‍♂️ 1. 新增：星空门卫拦截系统
        // ==========================================
        const currentUser = uni.getStorageSync('currentUser');
        if (!currentUser || !currentUser._id) {
            // 发现没有通行证，立刻打回登录页！
            uni.reLaunch({
                url: '/pages/login/login'
            });
            return; // 拦截后续代码执行
        }
        
        // 保存我的 ID，用于后续拉取通知
        this.myId = currentUser._id;
        console.log('--- 故事大厅门卫：已连接身份 ---', this.myId);

        // ==========================================
        // 🌟 2. 新增：进页面先查询未读通知数量 🔔
        // ==========================================
        this.fetchUnreadNotiCount();

        // 3. 原本的代码：获取头像、大厅列表
        const profile = uni.getStorageSync('userProfile');
        this.userProfile = profile || {};
        this.initPagination(); // 拉取故事列表
    },
    methods: {
        // ==========================================
        // 🌟 🔴 羁绊通知核心逻辑
        // ==========================================
        
        // A. 查询未读通知数量 (用于显示红点)
        async fetchUnreadNotiCount() {
            try {
                const res = await db.collection('star_notifications')
                    .where({
                        receiverId: this.myId,
                        isRead: false
                    })
                    .count();
                
                this.unreadNotiCount = (res.result && res.result.total !== undefined) ? res.result.total : (res.total || 0);
            } catch (err) {
                console.error('拉取通知数量失败:', err);
            }
        },

        // B. 打开信箱：拉取详细通知列表
        async openNotiModal() {
            this.showNotiModal = true;
            this.notificationList = []; 
            uni.showLoading({ title: '连接信箱中...' });
            
            try {
                const res = await db.collection('star_notifications')
                    .where({
                        receiverId: this.myId,
                        isRead: false
                    })
                    .orderBy('createTime', 'desc')
                    .limit(100)
                    .get();
                
                const resData = (res.result && res.result.data) ? res.result.data : (res.data || []);
                
                const formattedList = resData.map((item) => {
                    const d = new Date(item.createTime);
                    const month = d.getMonth() + 1;
                    const day = d.getDate();
                    const hours = d.getHours().toString().padStart(2, '0');
                    const minutes = d.getMinutes().toString().padStart(2, '0');
                    return {
                        ...item,
                        formatTime: `${month}月${day}日 ${hours}:${minutes}`
                    };
                });
                
                this.notificationList = formattedList;
                uni.hideLoading();
            } catch (err) {
                uni.hideLoading();
                uni.showToast({ title: '信箱出了点小差', icon: 'none' });
            }
        },

        // C. 关闭信箱：将所有展示的未读通知一键标记为“已读”
        async closeNotiModal() {
            this.showNotiModal = false;
            
            if (this.notificationList.length === 0) return;
            
            try {
                const notiIds = this.notificationList.map(item => item._id);
                const cmd = db.command;
                await db.collection('star_notifications').where({
                    _id: cmd.in(notiIds)
                }).update({
                    isRead: true
                });
                
                this.unreadNotiCount = 0;
                this.notificationList = []; 

            } catch (err) {
                console.error('标记已读失败:', err);
            }
        },

        // ==========================================
        // 以下为故事大厅原本的代码，保持不变
        // ==========================================
        goToProfile() { uni.navigateTo({ url: '/pages/profile/profile' }); },
        goToCoffee() { uni.navigateTo({ url: '/pages/coffee/coffee' }); },
        onSearchInput(e) { this.searchKeyword = e.detail.value; },
        onSearchConfirm() { this.currentPage = 1; this.initPagination(); },
        clearSearch() { this.searchKeyword = ''; this.currentPage = 1; this.initPagination(); },
        getSearchCondition() { const condition = { category: 'public' }; const keyword = this.searchKeyword ? this.searchKeyword.trim() : ''; if (keyword) { condition.title = new RegExp(keyword, 'i'); } return condition; },
        async initPagination() { try { const condition = this.getSearchCondition(); const res = await db.collection('stories').where(condition).count(); const totalCount = (res.result && res.result.total !== undefined) ? res.result.total : (res.total || 0); this.totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1; this.fetchStories(); } catch (err) { console.error('计算总数失败', err); } },
        fetchStories() { const { currentPage } = this; const condition = this.getSearchCondition(); uni.showLoading({ title: '寻找中...' }); db.collection('stories').where(condition).orderBy('id', 'asc').skip((currentPage - 1) * PAGE_SIZE).limit(PAGE_SIZE).get().then((res) => { uni.hideLoading(); this.storyList = (res.result && res.result.data) ? res.result.data : (res.data || []); uni.pageScrollTo({ scrollTop: 0, duration: 300 }); }).catch((err) => { uni.hideLoading(); }); },
        prevPage() { if (this.currentPage > 1) { this.currentPage = this.currentPage - 1; this.fetchStories(); } },
        nextPage() { if (this.currentPage < this.totalPages) { this.currentPage = this.currentPage + 1; this.fetchStories(); } },
        goToDetail(e) { const id = e.currentTarget.dataset.id; uni.navigateTo({ url: `/pages/storyDetail/storyDetail?id=${id}` }); },
        deleteStory(e) { 
            const realId = e.currentTarget.dataset.realid;
            const title = e.currentTarget.dataset.title;
            uni.showModal({
                title: '危险操作确认',
                content: `确定要将《${title}》从星空中永久抹去吗？`,
                confirmText: '永久摧毁',
                confirmColor: '#FF4D4F',
                cancelText: '再留一下',
                success: async (res) => {
                    if (res.confirm) {
                        uni.showLoading({ title: '摧毁中...' });
                        try {
                            await db.collection('stories').doc(realId).remove();
                            uni.hideLoading();
                            uni.showToast({ title: '已化为星尘', icon: 'success' });
                            this.fetchStories();
                        } catch (err) {
                            uni.hideLoading();
                            uni.showToast({ title: '摧毁失败，请重试', icon: 'error' });
                        }
                    }
                }
            });
        },
        openSecretDoor() { this.showSecretModal = true; this.secretPassword = ''; },
        hideSecretModal() { this.showSecretModal = false; this.secretPassword = ''; },
        onSecretPasswordInput(e) { this.secretPassword = e.detail.value; },
        verifySecretPassword() { 
            const safeInput = String(this.secretPassword || '').trim();
            if (safeInput === '093145') {
                this.hideSecretModal();
                uni.showToast({ title: '身份确认', icon: 'success' });
                setTimeout(() => {
                    uni.navigateTo({ url: '/pages/secretRadar/secretRadar' });
                }, 800);
            } else {
                uni.showToast({ title: '密码错误', icon: 'error' });
                this.secretPassword = '';
            }
        },
        stopBubble() { return; }
    }
};
</script>

<style>
@import './storyList.css';

/* === 🔔 通知中心与 💌 宇宙信箱 专属样式 === */

/* 头像与通知中心的布局行 */
.header-profile-row {
    position: absolute;
    top: 30rpx;
    right: 40rpx;
    display: flex;
    align-items: center;
    gap: 20rpx; /* 头像和铃铛的间距 */
    z-index: 10;
}

/* 头像按钮样式保持原样 */
.user-profile-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    border: 2rpx solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    width: 70rpx; 
    height: 70rpx;
    box-shadow: 0 0 15rpx rgba(255,255,255,0.1);
}
.mini-avatar-emoji { font-size: 45rpx; }

/* 🌟 新增：🔔 铃铛入口样式 */
.noti-bell-btn {
    width: 70rpx;
    height: 70rpx;
    background: rgba(255, 255, 255, 0.05);
    border: 2rpx solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative; /* 为了定位红点 */
    backdrop-filter: blur(5px);
}
.noti-bell-btn:active { transform: scale(0.9); background: rgba(255,255,255,0.1); }
.bell-icon { font-size: 40rpx; text-shadow: 0 0 10rpx rgba(255, 176, 32, 0.5); }

/* 🔴 新增：红点/未读数量样式 */
.bell-badge {
    position: absolute;
    top: -6rpx;
    right: -6rpx;
    min-width: 28rpx;
    height: 28rpx;
    background: #FF6B6B;
    border-radius: 50%;
    color: #fff;
    font-size: 18rpx;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 6rpx;
    box-shadow: 0 2rpx 6rpx rgba(255, 107, 107, 0.5);
    border: 2rpx solid rgba(10, 17, 40, 0.8); /* 加上边框，让红点更清晰 */
}

/* === 宇宙信箱弹窗的专有样式 === */
.noti-box {
    width: 620rpx;
    height: 750rpx; /* 高度固定，为了开启滚动 */
    background: rgba(30, 41, 59, 0.95);
}
.noti-scroll-list {
    flex: 1; /* 撑开中间区域 */
    height: 0; /* 配合 flex 使滚动生效 */
    margin-bottom: 30rpx;
}
.noti-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;
    border: 2rpx solid rgba(255,255,255,0.05);
}
.n-item-header {
    display: flex;
    align-items: center;
    margin-bottom: 15rpx;
    border-bottom: 1rpx dashed rgba(255,255,255,0.1);
    padding-bottom: 10rpx;
}
.n-icon { font-size: 32rpx; margin-right: 15rpx; color: #FFDAB9; }
.n-time { font-size: 22rpx; color: rgba(255,255,255,0.4); }
.n-content {
    font-size: 26rpx;
    color: #fff;
    line-height: 1.5;
}
.empty-noti-text {
    display: block;
    text-align: center;
    color: rgba(255,255,255,0.3);
    font-size: 28rpx;
    margin-top: 100rpx;
}
.close-modal-btn {
    width: 100%; height: 80rpx;
    background: linear-gradient(135deg, #FFDAB9 0%, #FFB020 100%);
    border-radius: 40rpx;
    color: #333;
    font-size: 30rpx;
    font-weight: bold;
    display: flex; justify-content: center; align-items: center;
    box-shadow: 0 10rpx 20rpx rgba(255, 176, 32, 0.3);
    border: none;
    margin-top: auto;
}
.close-modal-btn:active { opacity: 0.8; transform: scale(0.98); }
</style>