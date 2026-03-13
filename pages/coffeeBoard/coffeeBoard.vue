<template>
    <view class="coffee-container">
        <view class="night-sky">
            <view class="stars stars-slow"></view>
            <view class="stars stars-fast"></view>
        </view>

        <view class="glass-panel">
            <view class="header">
                <text class="title">☕ 星空留言板</text>
                <text class="subtitle">留下你的宇宙电波吧~ ✧( ु•⌄• )</text>
            </view>

            <scroll-view class="message-list" scroll-y="true" :scroll-into-view="scrollToId" scroll-with-animation>
                <block v-for="(item, index) in messageList" :key="index">
                    <view class="message-bubble" :id="'msg-' + index" @longpress="deleteMessage(item)">
                        <view class="bubble-header">
                            <text class="avatar-emoji">{{ item.avatarUrl || '👽' }}</text>
                            <view class="header-info">
                                <text class="nickname">{{ item.nickname || '星空访客' }}</text>
                                <text class="time">{{ item.formatTime }}</text>
                            </view>
                        </view>
                        <text class="message-text">{{ item.content }}</text>
                    </view>
                </block>
                <view style="height: 40rpx;"></view>
            </scroll-view>

            <view class="input-area">
                <input 
                    class="cute-input" 
                    placeholder="写下你想说的话..." 
                    placeholder-style="color: rgba(255,255,255,0.5);" 
                    v-model="inputValue"
                    confirm-type="send"
                    @confirm="sendMessage"
                />
                <view class="send-btn" @tap="sendMessage">发送 🚀</view>
            </view>
        </view>
    </view>
</template>

<script>
// 1. 初始化 uniCloud 数据库
const db = uniCloud.database();

export default {
    data() {
        return {
            inputValue: '',
            messageList: [],
            scrollToId: '',
            userProfile: null // 存放当前用户的头像和昵称
        };
    },
    onShow() {
        // 2. 每次进入页面，尝试获取一下本地的星空档案信息
        const profile = uni.getStorageSync('userProfile');
        if (profile) {
            this.userProfile = profile;
        } else {
            this.userProfile = { nickname: '星空访客', avatarUrl: '👽' };
        }
        
        this.fetchMessages();
    },
    methods: {
        // ==========================================
        // 📥 1. 从数据库拉取所有留言
        // ==========================================
        async fetchMessages() {
            try {
                const res = await db.collection('coffee_messages')
                    .orderBy('createTime', 'asc') // 旧的在上，新的在下
                    .limit(50)
                    .get();
                
                // 🔴 适配 uniCloud 的数据结构
                const resData = (res.result && res.result.data) ? res.result.data : (res.data || []);

                // 格式化时间戳
                const formattedData = resData.map(item => {
                    const date = new Date(item.createTime);
                    const month = date.getMonth() + 1;
                    const day = date.getDate();
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    return {
                        ...item,
                        formatTime: `${month}月${day}日 ${hours}:${minutes}`
                    };
                });

                // Vue 直接赋值即可触发渲染
                this.messageList = formattedData;

                // 延迟一点点滚动到最底部最新的一条留言
                setTimeout(() => {
                    if (this.messageList.length > 0) {
                        this.scrollToId = `msg-${this.messageList.length - 1}`;
                    }
                }, 300);

            } catch (err) {
                console.error('拉取留言失败:', err);
            }
        },

        // ==========================================
        // 🚀 2. 发送留言到星空
        // ==========================================
        async sendMessage() {
            const content = this.inputValue.trim();
            if (!content) {
                return uni.showToast({ title: '说点什么吧~', icon: 'none' });
            }

            uni.showLoading({ title: '发射电波中...' });

            try {
                // 写入数据库
                await db.collection('coffee_messages').add({
                    content: content,
                    nickname: this.userProfile.nickname,   // 携带档案室设定的昵称
                    avatarUrl: this.userProfile.avatarUrl, // 携带档案室设定的 Emoji
                    createTime: Date.now()                 // 🔴 替换掉报错的 db.serverDate()
                });

                uni.hideLoading();
                
                // 清空输入框 (因为用了 v-model，直接赋值为空即可清空界面)
                this.inputValue = '';
                
                // 重新拉取一次留言列表，马上看到自己发的
                this.fetchMessages();

            } catch (err) {
                uni.hideLoading();
                uni.showToast({ title: '发射失败', icon: 'error' });
                console.error('留言失败:', err);
            }
        },

        // ==========================================
        // 🗑️ 3. 长按收回留言 (可选的高级功能)
        // ==========================================
        deleteMessage(item) {
            uni.showModal({
                title: '抹去电波',
                content: `确定要收回这条留言吗？\n"${item.content}"`,
                confirmColor: '#FF4D4F',
                confirmText: '永久收回',
                success: async (res) => {
                    if (res.confirm) {
                        uni.showLoading({ title: '收回中...' });
                        try {
                            await db.collection('coffee_messages').doc(item._id).remove();
                            uni.hideLoading();
                            uni.showToast({ title: '电波已收回', icon: 'success' });
                            this.fetchMessages();
                        } catch (error) {
                            uni.hideLoading();
                            uni.showToast({ title: '收回失败', icon: 'error' });
                        }
                    }
                }
            });
        }
    }
};
</script>

<style>
/* 页面基础设置 */
page { 
    height: 100%; 
    background-color: #040710; 
}

.coffee-container { 
    width: 100vw; 
    height: 100vh; 
    position: relative; 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    overflow: hidden;
}

/* 星空背景动画 */
.night-sky { 
    position: absolute; 
    top: 0; left: 0; width: 100%; height: 100%; 
    z-index: -1; 
    background: radial-gradient(circle at center, #0a1128 0%, #000000 100%); 
}
.stars { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.stars-slow { 
    background-image: repeating-radial-gradient(white, rgba(255,255,255,0.2) 1rpx, transparent 2rpx, transparent 100rpx); 
    background-size: 500rpx 500rpx; opacity: 0.3; animation: starsMove 200s linear infinite; 
}
.stars-fast { 
    background-image: repeating-radial-gradient(white, rgba(255,255,255,0.3) 2rpx, transparent 3rpx, transparent 150rpx); 
    background-size: 400rpx 400rpx; opacity: 0.6; animation: starsMove 120s linear infinite; 
}
@keyframes starsMove { from { background-position: 0 0; } to { background-position: 1000rpx 1000rpx; } }

/* 玻璃拟物面板 */
.glass-panel {
    width: 90%;
    height: 90%;
    margin-top: 5%;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(15px);
    border: 2rpx solid rgba(255, 255, 255, 0.1);
    border-radius: 40rpx;
    display: flex;
    flex-direction: column;
    padding: 30rpx;
    box-sizing: border-box;
    box-shadow: 0 20rpx 50rpx rgba(0,0,0,0.5);
}

/* 头部标题 */
.header { margin-bottom: 30rpx; text-align: center; }
.title { font-size: 40rpx; font-weight: bold; color: #fff; text-shadow: 0 0 15rpx rgba(255,255,255,0.4); display: block; margin-bottom: 10rpx; }
.subtitle { font-size: 24rpx; color: rgba(255,255,255,0.6); }

/* 留言列表区 */
.message-list { flex: 1; height: 0; margin-bottom: 20rpx; }

/* 聊天气泡设计 */
.message-bubble {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 24rpx;
    padding: 24rpx;
    margin-bottom: 30rpx;
    border-left: 6rpx solid #FFB020;
    transition: all 0.3s;
}
.message-bubble:active { transform: scale(0.98); background: rgba(255, 255, 255, 0.15); }

/* 头像与信息栏 */
.bubble-header {
    display: flex; align-items: center; margin-bottom: 16rpx;
}
.avatar-emoji {
    font-size: 60rpx; margin-right: 20rpx;
    background: rgba(0,0,0,0.2); width: 80rpx; height: 80rpx;
    display: flex; justify-content: center; align-items: center;
    border-radius: 50%;
}
.header-info { display: flex; flex-direction: column; }
.nickname { font-size: 28rpx; font-weight: bold; color: #FFDAB9; margin-bottom: 6rpx; }
.time { font-size: 22rpx; color: rgba(255,255,255,0.4); }

/* 留言正文 */
.message-text { font-size: 30rpx; color: #fff; line-height: 1.5; word-wrap: break-word; }

/* 底部输入区 */
.input-area {
    display: flex; align-items: center; justify-content: space-between;
    background: rgba(0,0,0,0.3); border-radius: 40rpx; padding: 10rpx 10rpx 10rpx 30rpx;
    border: 2rpx solid rgba(255,255,255,0.1);
}
.cute-input {
    flex: 1; height: 70rpx; color: #fff; font-size: 28rpx;
}
.send-btn {
    background: linear-gradient(135deg, #FFB020 0%, #FF6B6B 100%);
    color: #fff; font-weight: bold; font-size: 28rpx;
    padding: 16rpx 36rpx; border-radius: 35rpx; margin-left: 20rpx;
    box-shadow: 0 4rpx 15rpx rgba(255, 107, 107, 0.4);
}
.send-btn:active { transform: scale(0.9); }
</style>