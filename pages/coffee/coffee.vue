<template>
    <view class="coffee-container">
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
            <view class="header">
                <text class="title">☕ 星空咖啡店</text>
                <text class="subtitle">宇宙的尽头，是坐下来喝杯咖啡</text>
            </view>

            <view class="board-card" @tap="goToBoard">
                <view class="card-header">
                    <text class="card-icon">💌</text>
                    <text class="card-title">星空留言板</text>
                </view>

                <view class="card-preview">
                    <block v-if="latestMessage">
                        <view class="preview-user">
                            <text class="preview-emoji">{{ latestMessage.avatarUrl || '👽' }}</text>
                            <text class="preview-name">{{ latestMessage.nickname }} :</text>
                        </view>
                        <text class="preview-text">"{{ latestMessage.content }}"</text>
                    </block>
                    <block v-else>
                        <text class="preview-text empty-text">暂无宇宙电波，快来留下第一条吧~</text>
                    </block>
                </view>

                <view class="card-footer">
                    <text class="click-hint">推开门进入互动 >></text>
                </view>
            </view>

            <view class="board-card mt-40" @tap="goToWallet">
                <view class="card-header">
                    <text class="card-icon">🎟️</text>
                    <text class="card-title">宝宝的专属卡包</text>
                </view>

                <view class="card-preview">
                    <text class="preview-text empty-text">里面装满了小华子给宝宝的特权券喔~</text>
                </view>

                <view class="card-footer">
                    <text class="click-hint">打开卡包查看特权 >></text>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
const db = uniCloud.database();

export default {
    data() {
        return {
            latestMessage: null // 用于存放最新的一条留言
        };
    },
    onShow() {
        // 每次进入咖啡店大厅，都去拉取最新的一条留言作为预览
        this.fetchLatestMessage();
    },
    methods: {
        async fetchLatestMessage() {
            try {
                // 按时间倒序（最新在最前），只要 1 条
                const res = await db.collection('coffee_messages').orderBy('createTime', 'desc').limit(1).get();
                
                // 🔴 核心修复 1：完美适配 uniCloud 的获取数据结构
                const resData = (res.result && res.result.data) ? res.result.data : (res.data || []);
                
                if (resData.length > 0) {
                    this.latestMessage = resData[0];
                } else {
                    this.latestMessage = null;
                }
            } catch (err) {
                console.error('拉取最新留言预览失败:', err);
            }
        },

        goToBoard() {
            uni.navigateTo({
                url: '/pages/coffeeBoard/coffeeBoard'
            });
        },

        goToWallet() {
            uni.navigateTo({
                url: '/pages/cardWallet/cardWallet'
            });
        }
    }
};
</script>

<style>
@import './coffee.css';

/* === 新增：为预览区的 Emoji 头像补充一点样式 === */
.preview-user {
    display: flex;
    align-items: center;
    margin-bottom: 10rpx;
}

.preview-emoji {
    font-size: 36rpx;
    margin-right: 15rpx;
    background: rgba(0, 0, 0, 0.2);
    width: 50rpx;
    height: 50rpx;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
}
</style>