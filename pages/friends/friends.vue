<template>
    <view class="friends-container">
        <view class="night-sky">
            <view class="stars stars-slow"></view>
            <view class="stars stars-fast"></view>
        </view>

        <view class="glass-panel">
            <text class="title">🔗 星空羁绊</text>
            <text class="subtitle">输入对方的专属ID，建立宇宙连接</text>

            <view class="search-box">
                <input 
                    class="glass-input" 
                    placeholder="请输入对方的 NO. 编号" 
                    placeholder-style="color: rgba(255,255,255,0.4);" 
                    :value="targetId"
                    @input="onTargetIdInput"
                />
                <button class="add-btn" @tap="addFriend">建立连接</button>
            </view>

            <view class="divider"></view>
            <text class="list-title">我的星空羁绊</text>

            <scroll-view class="friends-list" scroll-y="true">
                <view v-if="friendList.length > 0">
                    <view class="friend-card" v-for="(item, index) in friendList" :key="index">
                        <text class="f-icon">🤝</text>
                        <view class="f-info">
                            <text class="f-name">已连接的宇宙星球</text>
                            <text class="f-id">ID: {{ item.friendId }}</text>
                        </view>
                    </view>
                </view>
                <view v-else>
                    <text class="empty-text">浩瀚宇宙，你还没有绑定另一半喔~</text>
                </view>
            </scroll-view>

        </view>
    </view>
</template>

<script>
const db = uniCloud.database();

export default {
    data() {
        return {
            myId: '',
            targetId: '',
            friendList: []
        };
    },
    onShow() {
        // 打印日志，方便你在控制台看到执行进度
        console.log('--- 羁绊页面已打开 ---');
        
        const currentUser = uni.getStorageSync('currentUser');
        if (currentUser && currentUser._id) {
            this.myId = currentUser._id;
            console.log('获取到我的ID:', this.myId);
            this.fetchFriends();
        } else {
            console.log('未登录，没有专属ID');
        }
    },
    methods: {
        // 输入框内容同步
        onTargetIdInput(e) {
            this.targetId = e.detail.value.trim();
        },

        // 拉取好友列表
        async fetchFriends() {
            try {
                const res = await db.collection('star_friends').where({
                    userId: this.myId
                }).get();
                
                // 确保数据格式兼容
                const resData = (res.result && res.result.data) ? res.result.data : (res.data || []);
                this.friendList = resData;
                console.log('成功拉取好友列表:', this.friendList);
            } catch (err) {
                console.error('获取好友列表失败:', err);
            }
        },

        // 建立羁绊（添加好友）
        async addFriend() {
            const tid = this.targetId;
            if (!tid) {
                return uni.showToast({ title: '专属ID不能为空', icon: 'none' });
            }
            if (tid === this.myId) {
                return uni.showToast({ title: '不能添加自己喔', icon: 'none' });
            }

            uni.showLoading({ title: '搜寻信号中...' });

            try {
                // 1. 检查这个 ID 的用户是否存在
                const userRes = await db.collection('star_users').where({ _id: tid }).get();
                const users = (userRes.result && userRes.result.data) ? userRes.result.data : (userRes.data || []);
                if (users.length === 0) {
                    uni.hideLoading();
                    return uni.showToast({ title: '未找到该专属ID', icon: 'none' });
                }

                // 2. 检查是否已经是好友了
                const checkRes = await db.collection('star_friends').where({
                    userId: this.myId,
                    friendId: tid
                }).get();
                const checks = (checkRes.result && checkRes.result.data) ? checkRes.result.data : (checkRes.data || []);
                if (checks.length > 0) {
                    uni.hideLoading();
                    return uni.showToast({ title: '你们已经是羁绊啦', icon: 'none' });
                }

                // 3. 互相添加好友（双向奔赴）
                await db.collection('star_friends').add({
                    userId: this.myId,
                    friendId: tid,
                    createTime: Date.now()
                });
                await db.collection('star_friends').add({
                    userId: tid,
                    friendId: this.myId,
                    createTime: Date.now()
                });

                uni.hideLoading();
                uni.showToast({ title: '羁绊建立成功！', icon: 'success' });
                
                this.targetId = '';
                this.fetchFriends(); // 刷新列表

            } catch (err) {
                uni.hideLoading();
                console.error('添加失败详细原因:', err);
                uni.showToast({ title: '网络出小差啦', icon: 'none' });
            }
        }
    }
};
</script>

<style scoped>
/* 🔴 修复：增加了 scoped，防止和其他页面的 css 冲突导致隐藏 */
page { height: 100%; background-color: #040710; }
.friends-container { width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; position: relative; }

/* 星空背景 */
.night-sky { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; background: radial-gradient(circle at center, #0a1128 0%, #000000 100%); }
.stars { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.stars-slow { background-image: repeating-radial-gradient(white, rgba(255,255,255,0.2) 1rpx, transparent 2rpx, transparent 100rpx); background-size: 500rpx 500rpx; opacity: 0.3; animation: starsMove 200s linear infinite; }
.stars-fast { background-image: repeating-radial-gradient(white, rgba(255,255,255,0.3) 2rpx, transparent 3rpx, transparent 150rpx); background-size: 400rpx 400rpx; opacity: 0.6; animation: starsMove 120s linear infinite; }
@keyframes starsMove { from { background-position: 0 0; } to { background-position: 1000rpx 1000rpx; } }

/* 玻璃面板 */
.glass-panel { width: 85%; height: 80vh; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(15px); border: 2rpx solid rgba(255, 255, 255, 0.1); border-radius: 40rpx; padding: 50rpx 40rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 20rpx 50rpx rgba(0,0,0,0.5); box-sizing: border-box; }
.title { font-size: 44rpx; font-weight: bold; color: #fff; text-shadow: 0 0 15rpx rgba(255,176,32,0.6); margin-bottom: 10rpx; }
.subtitle { font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 40rpx; }

/* 搜索框区域 */
.search-box { width: 100%; display: flex; flex-direction: column; gap: 20rpx; margin-bottom: 40rpx; }
.glass-input { width: 100%; height: 80rpx; background: rgba(0,0,0,0.3); border-radius: 20rpx; padding: 0 30rpx; color: #fff; font-size: 28rpx; border: 2rpx solid rgba(255,255,255,0.1); box-sizing: border-box;}
.add-btn { width: 100%; height: 80rpx; background: linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%); border-radius: 40rpx; color: #333; font-size: 30rpx; font-weight: bold; display: flex; justify-content: center; align-items: center; box-shadow: 0 10rpx 20rpx rgba(132, 250, 176, 0.3); border: none; }
.add-btn:active { transform: scale(0.95); }

/* 分割线与列表标题 */
.divider { width: 100%; height: 2rpx; background: rgba(255,255,255,0.1); margin-bottom: 30rpx; }
.list-title { font-size: 28rpx; color: #FFDAB9; font-weight: bold; margin-bottom: 20rpx; align-self: flex-start; }

/* 列表区 */
.friends-list { flex: 1; height: 0; width: 100%; }
.friend-card { display: flex; align-items: center; background: rgba(255, 255, 255, 0.05); padding: 24rpx; border-radius: 20rpx; margin-bottom: 20rpx; border: 2rpx solid rgba(255,255,255,0.05); }
.f-icon { font-size: 50rpx; margin-right: 20rpx; }
.f-info { display: flex; flex-direction: column; }
.f-name { color: #fff; font-size: 28rpx; font-weight: bold; margin-bottom: 6rpx; }
.f-id { color: rgba(255,255,255,0.5); font-size: 22rpx; font-family: monospace; }
.empty-text { display: block; text-align: center; color: rgba(255,255,255,0.3); font-size: 24rpx; margin-top: 100rpx; }
</style>